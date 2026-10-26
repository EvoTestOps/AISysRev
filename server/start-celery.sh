#!/bin/sh
set -e

# Celery starts one worker process per CPU it sees unless CELERY_CONCURRENCY is set.

if [ "$DEBUG" = "true" ]; then
    exec /app/.venv/bin/python -m debugpy --listen 0.0.0.0:5677 -m celery -A src.worker worker --loglevel=info ${CELERY_CONCURRENCY:+--concurrency=$CELERY_CONCURRENCY}
else
    exec /app/.venv/bin/celery -A src.worker worker --loglevel=info ${CELERY_CONCURRENCY:+--concurrency=$CELERY_CONCURRENCY}
fi