#!/bin/sh
if [ "$DEBUG" = "true" ]; then
    uv run debugpy --listen 0.0.0.0:5678 --wait-for-client -m uv run uvicorn src.main:app --host 0.0.0.0 --port 8080
else
    uv run uvicorn src.main:app --host 0.0.0.0 --port 8080
fi