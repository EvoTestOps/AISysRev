#!/bin/sh
celery -A src.worker worker --loglevel=info &
uvicorn src.main:app --host 0.0.0.0 --port 8080 --reload
