#!/usr/bin/env bash
# Fail if client/openapi.json differs from what `make openapi` generates from the backend.
set -euo pipefail

cd "$(dirname "$0")/.."

make openapi

if ! git diff --exit-code -- client/openapi.json; then
  echo "client/openapi.json is out of date. Run 'make openapi' and commit the result." >&2
  exit 1
fi

echo "client/openapi.json is up to date."
