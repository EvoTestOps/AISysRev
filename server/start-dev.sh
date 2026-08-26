#!/bin/sh
set -e

HOST=${HOST:-0.0.0.0}
PORT=${PORT:-8080}
DEBUG_PORT=${DEBUG_PORT:-5678}
LOG_DIR=${LOG_DIR:-/app/logs}

: "${DB_URL:?DB_URL is not set}"
./migrate.sh

mkdir -p "$LOG_DIR"

if [ "$DEBUG" = "true" ]; then
    echo "Starting server in DEBUG mode on port $DEBUG_PORT..."
    uv run debugpy --listen 0.0.0.0:$DEBUG_PORT -m uvicorn src.main:app --host $HOST --port $PORT --log-config logging_config_dev.json
else
    echo "Starting server in normal mode..."
    uv run uvicorn src.main:app --host $HOST --port $PORT --log-config logging_config_dev.json
fi
