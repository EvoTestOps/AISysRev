#!/bin/sh
set -e

DEBUG_PORT=${DEBUG_PORT:-5679}
LOG_DIR=${LOG_DIR:-/app/logs}

mkdir -p "$LOG_DIR"

if [ "$DEBUG" = "true" ]; then
    echo "Starting Celery worker in DEBUG mode on port $DEBUG_PORT..."
    uv run debugpy --listen 0.0.0.0:$DEBUG_PORT -m celery -A src.worker worker --loglevel=debug
else
    echo "Starting Celery worker in normal mode..."
    uv run celery -A src.worker worker --loglevel=debug
fi
