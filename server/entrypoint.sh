#!/bin/sh
# Alpine does not have bash
set -e

if [ "$APP_ENV" = "test" ]; then
  export DB_URL="$TEST_DB_URL"
  echo "Using TEST_DB_URL"
elif [ "$APP_ENV" = "prod" ]; then
  export DB_URL="$PROD_DB_URL"
  echo "Using PROD_DB_URL"
else
  export DB_URL="$DEV_DB_URL"
  echo "Using DEV_DB_URL"
fi

exec "$@"