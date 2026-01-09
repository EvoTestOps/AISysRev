#!/bin/sh
set -e

if [ "$DEBUG" = "true" ]; then
    uv run debugpy --listen 0.0.0.0:5677 -m uv run celery -A src.worker worker --loglevel=info
else
    uv run celery -A src.worker worker --loglevel=info
fi