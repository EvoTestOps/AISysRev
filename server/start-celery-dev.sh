#!/bin/sh
set -e

DEBUG_PORT=${DEBUG_PORT:-5678}

if [ "$DEBUG" = "true" ]; then
    echo "Starting Celery worker in DEBUG mode on port $DEBUG_PORT..."
    exec uv run debugpy --listen 0.0.0.0:$DEBUG_PORT --wait-for-client -m celery -A src.worker worker --loglevel=info
else
    echo "Starting Celery worker in normal mode..."
    exec uv run celery -A src.worker worker --loglevel=info
fi
