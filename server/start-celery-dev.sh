#!/bin/sh
set -e

DEBUG_PORT=${DEBUG_PORT:-5677}

if [ "$DEBUG" = "true" ]; then
    echo "Starting Celery worker in DEBUG mode on port $DEBUG_PORT..."
    uv run debugpy --listen 0.0.0.0:$DEBUG_PORT -m celery -A src.worker worker --loglevel=info
else
    echo "Starting Celery worker in normal mode..."
    uv run celery -A src.worker worker --loglevel=info
fi
