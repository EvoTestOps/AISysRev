#!/bin/sh
set -e

HOST=${HOST:-0.0.0.0}
PORT=${PORT:-8080}
: "${DB_URL:?DB_URL is not set}"
./migrate.sh

/app/.venv/bin/uvicorn src.main:app --host $HOST --port $PORT