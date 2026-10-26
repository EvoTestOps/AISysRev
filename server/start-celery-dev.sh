#!/bin/sh
set -e

DEBUG_PORT=${DEBUG_PORT:-5677}
# Celery starts one worker process per CPU it sees unless CELERY_CONCURRENCY is set.

if [ "$DEBUG" = "true" ]; then
    echo "Starting Celery worker in DEBUG mode on port $DEBUG_PORT..."
    exec uv run debugpy --listen 0.0.0.0:"$DEBUG_PORT" -m celery -A src.worker worker --loglevel=info ${CELERY_CONCURRENCY:+--concurrency=$CELERY_CONCURRENCY}
else
    echo "Starting Celery worker in normal mode..."
    exec uv run celery -A src.worker worker --loglevel=info ${CELERY_CONCURRENCY:+--concurrency=$CELERY_CONCURRENCY}
fi
