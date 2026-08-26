#!/bin/sh
set -e

if [ "$DEBUG" = "true" ]; then
    /app/.venv/bin/python -m debugpy --listen 0.0.0.0:5679 -m celery -A src.worker worker --loglevel=info
else
    /app/.venv/bin/celery -A src.worker worker --loglevel=info
fi