#!/bin/sh
set -e

HOST=${HOST:-0.0.0.0}
PORT=${PORT:-8080}
DEBUG_PORT=${DEBUG_PORT:-5678}

: "${DB_URL:?DB_URL is not set}"
./migrate.sh

if [ "$DEBUG" = "true" ]; then
    echo "Starting server in DEBUG mode on port $DEBUG_PORT..."
    uv run debugpy --listen 0.0.0.0:$DEBUG_PORT --wait-for-client -m uvicorn src.main:app --host $HOST --port $PORT
else
    echo "Starting server in normal mode..."
    uv run uvicorn src.main:app --host $HOST --port $PORT
fi
