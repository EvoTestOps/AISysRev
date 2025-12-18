#!/bin/sh
set -e
: "${DB_URL:?DB_URL is not set}"
uv run alembic upgrade head