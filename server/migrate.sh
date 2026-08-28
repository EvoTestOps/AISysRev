#!/bin/sh
set -e
: "${DB_URL:?DB_URL is not set}"
/app/.venv/bin/alembic upgrade head