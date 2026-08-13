#!/bin/bash
# Single CLI entry point for all three AISysRev fuzzers.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_URL="http://localhost:8090"
RESTLER_IMG="mcr.microsoft.com/restlerfuzzer/restler"
SCHEMATHESIS_IMG="schemathesis/schemathesis:stable"
JAVA_IMG="eclipse-temurin:21-jre"

# Excluded files
COMMON_EXCLUDE_PATHS=(
  "/api/v1/event-queue"
  "/api/v1/run-test-task"
  "/api/v1/task-status/{task_id}"
  "/register-and-privacy-policy"
  "/terms-and-conditions"
)

# These files below are excluded by Schemathesis and Evomaster since they kill the sessions they depend on.
SESSION_FRAGILE_PATHS=(
  "/api/v1/auth/logout"
  "/api/v1/auth/me"
)

AUTH_FLOW_EXCLUDE_PATHS=(
  "/api/v1/auth/login"
  "/api/v1/auth/callback"
  "/api/v1/auth/dev-login"
)

RESTLER_EXCLUDE_PATHS=(
  "${SESSION_FRAGILE_PATHS[@]}"
  "${AUTH_FLOW_EXCLUDE_PATHS[@]}"
)

usage() {
  cat <<EOF
Usage: $0 <tool> [mode] [extra]

  restler       modes: test (default), fuzz-lean, fuzz [time_budget_hours]
  schemathesis  modes: smoke (default), lean, full
  evomaster     (no modes)

Examples:
  $0 restler
  $0 restler fuzz 1
  $0 schemathesis full
  $0 evomaster
EOF
  exit 1
}

require_tools() {
  local missing=()
  for tool in docker curl python3; do
    command -v "$tool" >/dev/null 2>&1 || missing+=("$tool")
  done
  if [ "${#missing[@]}" -gt 0 ]; then
    echo "Missing required tools on the host: ${missing[*]}" >&2
    exit 1
  fi
}

check_backend() {
  if ! curl -sf -m 5 "$BASE_URL/api/v1/health" >/dev/null 2>&1; then
    echo "Backend not reachable at $BASE_URL - is the dev stack running? (make start-dev)" >&2
    exit 1
  fi
}


ensure_layout() {
  mkdir -p "$SCRIPT_DIR/specs" "$SCRIPT_DIR/restler" \
    "$SCRIPT_DIR/schemathesis" "$SCRIPT_DIR/evomaster/evomaster-tests"
  chmod a+rX "$SCRIPT_DIR" "$SCRIPT_DIR/auth.py"
  chmod a+rwX "$SCRIPT_DIR/specs" "$SCRIPT_DIR/restler" \
    "$SCRIPT_DIR/schemathesis" "$SCRIPT_DIR/evomaster" \
    "$SCRIPT_DIR/evomaster/evomaster-tests"
}

fetch_spec() {
  if ! curl -sf "$BASE_URL/openapi.json" -o "$SCRIPT_DIR/specs/aisysrev_live.json"; then
    echo "Failed to fetch the OpenAPI spec from $BASE_URL/openapi.json" >&2
    exit 1
  fi
  chmod a+r "$SCRIPT_DIR/specs/aisysrev_live.json"
}

get_cookie() {
  python3 "$SCRIPT_DIR/auth.py" | tail -1
}

run_restler() {
  local mode="${1:-test}"
  fetch_spec

  echo "Compiling RESTler grammar..." >&2
  docker run --rm -v "$SCRIPT_DIR":/fuzzing -w /fuzzing/restler "$RESTLER_IMG" \
    dotnet /RESTler/restler/Restler.dll compile --api_spec /fuzzing/specs/aisysrev_live.json


  local exclude_json
  exclude_json=$(printf '"%s",' "${COMMON_EXCLUDE_PATHS[@]}" "${RESTLER_EXCLUDE_PATHS[@]}")
  exclude_json="[${exclude_json%,}]"
  docker run --rm --entrypoint python3 -v "$SCRIPT_DIR":/fuzzing "$RESTLER_IMG" -c "
import json
p = '/fuzzing/restler/Compile/engine_settings.json'
d = json.load(open(p))
d['max_request_execution_time'] = 10
d['exclude_requests'] = [{'endpoint': e} for e in $exclude_json]
json.dump(d, open(p, 'w'), indent=2)
"

  local common=(
    --grammar_file /fuzzing/restler/Compile/grammar.py
    --dictionary_file /fuzzing/restler/Compile/dict.json
    --settings /fuzzing/restler/Compile/engine_settings.json
    --host localhost --target_port 8090 --no_ssl
    --token_refresh_interval 300
    --token_refresh_command "python3 /fuzzing/auth.py"
  )

  case "$mode" in
    test)
      docker run --rm -v "$SCRIPT_DIR":/fuzzing -w /fuzzing/restler --network host "$RESTLER_IMG" \
        dotnet /RESTler/restler/Restler.dll test "${common[@]}"
      ;;
    fuzz-lean)
      docker run --rm -v "$SCRIPT_DIR":/fuzzing -w /fuzzing/restler --network host "$RESTLER_IMG" \
        dotnet /RESTler/restler/Restler.dll fuzz-lean "${common[@]}"
      ;;
    fuzz)
    # The budget below can be modified to run for a longer time -> deeper run.
      local budget="${2:-0.1}"
      docker run --rm -v "$SCRIPT_DIR":/fuzzing -w /fuzzing/restler --network host "$RESTLER_IMG" \
        dotnet /RESTler/restler/Restler.dll fuzz "${common[@]}" --time_budget "$budget"
      ;;
    *)
      echo "Unknown restler mode: $mode" >&2
      usage
      ;;
  esac
}

run_schemathesis() {
  local mode="${1:-smoke}"
  mkdir -p "$SCRIPT_DIR/schemathesis/$mode"
  chmod a+rwX "$SCRIPT_DIR/schemathesis/$mode"
  local cookie
  cookie="$(get_cookie)"
  local excludes=()
  for path in "${COMMON_EXCLUDE_PATHS[@]}" "${SESSION_FRAGILE_PATHS[@]}" "${AUTH_FLOW_EXCLUDE_PATHS[@]}"; do
    excludes+=(--exclude-path "$path")
  done

  case "$mode" in
    smoke)
      docker run --rm -v "$SCRIPT_DIR":/fuzzing --network host "$SCHEMATHESIS_IMG" \
        run "$BASE_URL/openapi.json" -u "$BASE_URL" \
        "${excludes[@]}" \
        -n 5 -m positive -c not_a_server_error --phases fuzzing -w 1 \
        --request-timeout 10 --continue-on-failure --seed 1 \
        -H "$cookie" \
        --report junit --report-dir /fuzzing/schemathesis/smoke
      ;;
    lean)
      docker run --rm -v "$SCRIPT_DIR":/fuzzing --network host "$SCHEMATHESIS_IMG" \
        run "$BASE_URL/openapi.json" -u "$BASE_URL" \
        "${excludes[@]}" \
        -n 25 -m all \
        -c not_a_server_error,status_code_conformance,response_schema_conformance,content_type_conformance \
        --phases examples,coverage,fuzzing -w 1 \
        --request-timeout 10 --continue-on-failure --seed 1 \
        -H "$cookie" \
        --report junit --report-dir /fuzzing/schemathesis/lean
      ;;
    full)
      docker run --rm -v "$SCRIPT_DIR":/fuzzing --network host "$SCHEMATHESIS_IMG" \
        run "$BASE_URL/openapi.json" -u "$BASE_URL" \
        "${excludes[@]}" \
        -n 150 -m all \
        -c not_a_server_error,status_code_conformance,content_type_conformance,response_schema_conformance,response_headers_conformance,negative_data_rejection,positive_data_acceptance \
        --phases examples,coverage,fuzzing,stateful -w 2 \
        --request-timeout 10 --continue-on-failure --seed 1 \
        -H "$cookie" \
        --report junit --report-dir /fuzzing/schemathesis/full
      ;;
    *)
      echo "Unknown schemathesis mode: $mode" >&2
      usage
      ;;
  esac
}


ensure_evomaster() {
  [ -f "$SCRIPT_DIR/evomaster/evomaster.jar" ] && return
  echo "Downloading latest EvoMaster..." >&2
  curl -fL https://github.com/WebFuzzing/EvoMaster/releases/latest/download/evomaster.jar \
    -o "$SCRIPT_DIR/evomaster/evomaster.jar"
  chmod a+r "$SCRIPT_DIR/evomaster/evomaster.jar"
}

run_evomaster() {
  local cookie
  cookie="$(get_cookie)"
  ensure_evomaster
  local exclude_list
  exclude_list=$(IFS=,; echo "${COMMON_EXCLUDE_PATHS[*]},${SESSION_FRAGILE_PATHS[*]},${AUTH_FLOW_EXCLUDE_PATHS[*]}")
  docker run --rm -v "$SCRIPT_DIR":/fuzzing -w /fuzzing/evomaster --network host "$JAVA_IMG" \
    java -jar evomaster.jar --blackBox true \
      --bbSwaggerUrl "$BASE_URL/openapi.json" \
      --bbTargetUrl "$BASE_URL" \
      --maxTime 1h \
      --outputFormat PYTHON_UNITTEST \
      --outputFolder evomaster-tests \
      --header0 "$cookie" \
      --endpointExclude "$exclude_list" \
      --ratePerMinute 60
}

TOOL="${1:-}"
[ -z "$TOOL" ] && usage
require_tools
check_backend
ensure_layout

case "$TOOL" in
  restler) run_restler "${2:-}" "${3:-}" ;;
  schemathesis) run_schemathesis "${2:-}" ;;
  evomaster) run_evomaster ;;
  *) usage ;;
esac
