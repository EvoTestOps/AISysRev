#!/bin/bash
set -e

export APP_ENV=test
echo "Starting backend with APP_ENV=$APP_ENV"
env | grep APP_ENV

python3 -m src.core.init_test_db

npm --prefix ../client run dev -- --port 3000 &
uvicorn main:app --host 0.0.0.0 --port 8080 --reload &

for i in {1..30}; do
  if curl -sSf http://localhost:8080/api/v1/health > /dev/null; then
    echo "Backend is ready"
    break
  fi
  echo "Waiting for backend... ($i/30)"
  sleep 2
done

wait