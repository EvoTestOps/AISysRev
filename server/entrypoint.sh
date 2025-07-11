#!/bin/sh
# Alpine does not have bash
set -e

if [ "$TEST_MODE" = "true" ]; then
  export DB_URL="$TEST_DB_URL"
  echo "Using TEST_DB_URL"
else
  echo "Using default DB_URL"
fi

exec "$@"