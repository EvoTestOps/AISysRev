#!/usr/bin/env bash
# Open the app in the default browser as soon as it answers.
# Usage: scripts/open-when-ready.sh <url> &
# `make start` runs this in the background next to `docker compose up`. Any
# HTTP response counts as ready: Caddy shows a startup page until the backend
# is up. Gives up after 240 seconds, or when `docker compose up` (the parent)
# exits, e.g. on Ctrl+C. Set NO_BROWSER=1 to skip.
set -u

url="$1"
parent=$PPID

[ -n "${NO_BROWSER:-}" ] && exit 0

for _ in $(seq 240); do
  kill -0 "$parent" 2>/dev/null || exit 0
  if curl -sk -o /dev/null "$url"; then
    if [ "$(uname)" = Darwin ]; then
      open "$url"
    elif command -v wslview >/dev/null; then
      wslview "$url"
    elif command -v xdg-open >/dev/null; then
      xdg-open "$url" >/dev/null 2>&1
    else
      echo "AISysRev is running at $url"
    fi
    exit 0
  fi
  sleep 1
done
