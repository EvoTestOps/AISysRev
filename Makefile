# LOCAL (default)
# Run the production build on this machine without login: every request acts
# as a mock user (LOCAL_ENV). At https://localhost:3000, which opens in the
# browser once it answers (NO_BROWSER=1 to skip).
start:
	LOCAL_ENV=true FLOWER_PORT=5555 ADMINER_PORT=8080 docker compose -f docker-compose.yml -p local down
	./scripts/open-when-ready.sh https://localhost:3000 & LOCAL_ENV=true FLOWER_PORT=5555 ADMINER_PORT=8080 docker compose -f docker-compose.yml -p local up --build
# DEV
# Start dev containers with live reloading and build on startup (default development setup).
# Add LOCAL_ENV=true to skip the login.
start-dev:
	FRONTEND_PORT=3001 FLOWER_PORT=5556 ADMINER_PORT=8081 APP_ENV=dev docker compose -f docker-compose-dev.yml -p dev down
	FRONTEND_PORT=3001 FLOWER_PORT=5556 ADMINER_PORT=8081 APP_ENV=dev docker compose -f docker-compose-dev.yml -p dev up --watch --build
start-dev-debug:
	DEBUG=true FRONTEND_PORT=3001 FLOWER_PORT=5556 ADMINER_PORT=8081 APP_ENV=dev docker compose -f docker-compose-dev.yml -p dev down
	DEBUG=true FRONTEND_PORT=3001 FLOWER_PORT=5556 ADMINER_PORT=8081 APP_ENV=dev docker compose -f docker-compose-dev.yml -p dev up --watch --build
# TEST
# The e2e test stack: the production images with APP_ENV=test, at https://localhost:3002.
start-test:
	docker compose -f docker-compose-e2e.yml -p e2e down -v
	docker compose -f docker-compose-e2e.yml -p e2e up --build
# The dev stack with APP_ENV=test and the backend debugger, also at :3002.
start-test-debug:
	DEBUG=true FRONTEND_PORT=3002 FLOWER_PORT=5557 ADMINER_PORT=8082 APP_ENV=test FRONTEND_URL=https://localhost:3002 docker compose -f docker-compose-dev.yml -p test down -v
	DEBUG=true FRONTEND_PORT=3002 FLOWER_PORT=5557 ADMINER_PORT=8082 APP_ENV=test FRONTEND_URL=https://localhost:3002 docker compose -f docker-compose-dev.yml -p test up --build
# PROD
start-prod:
	FRONTEND_PORT=3000 FLOWER_PORT=5555 ADMINER_PORT=8080 APP_ENV=prod docker compose -f docker-compose.yml -p prod down
	FRONTEND_PORT=3000 FLOWER_PORT=5555 ADMINER_PORT=8080 APP_ENV=prod docker compose -f docker-compose.yml -p prod up --build
# Build only the prod backend image (server target of Dockerfile).
# The same image runs the API, the celery worker and flower.
build-prod-backend:
	APP_ENV=prod docker compose -f docker-compose.yml -p prod build backend
# Build only the prod frontend image (client target of Dockerfile)
build-prod-frontend:
	APP_ENV=prod docker compose -f docker-compose.yml -p prod build frontend

# Create a new database migration based on model changes
# Usage: make migration-create m="Add new table"
# Migration commands here should only be run against the development environment
m-create:
	APP_ENV=dev docker compose -f docker-compose-dev.yml -p dev exec backend uv run alembic revision --autogenerate -m "$(m)"

# Apply all unapplied migrations to bring the database up to date
m-up:
	APP_ENV=dev docker compose -f docker-compose-dev.yml -p dev exec backend uv run alembic upgrade head

# Show the full history of migrations with details
m-hist:
	APP_ENV=dev docker compose -f docker-compose-dev.yml -p dev exec backend uv run alembic history --verbose

# Display the current migration version applied to the database
m-current:
	APP_ENV=dev docker compose -f docker-compose-dev.yml -p dev exec backend uv run alembic current

# Run unit tests
backend-unit:
	APP_ENV=test docker compose -f docker-compose-dev.yml -p test build backend
	APP_ENV=test docker compose -f docker-compose-dev.yml -p test up -d postgres redis celery
	APP_ENV=test RUN_MIGRATIONS=false docker compose -f docker-compose-dev.yml -p test run --rm --no-deps backend uv run pytest -m unit -v -s --cov=src
	APP_ENV=test docker compose -f docker-compose-dev.yml -p test down

# Run all tests in the backend
backend-test:
	APP_ENV=test docker compose -f docker-compose-dev.yml -p test down -v
	APP_ENV=test docker compose -f docker-compose-dev.yml -p test up -d --build backend postgres redis celery
	APP_ENV=test RUN_MIGRATIONS=true docker compose -f docker-compose-dev.yml -p test run --rm backend uv run pytest -m asyncio -v -s --cov=src $(REPORT)
	APP_ENV=test docker compose -f docker-compose-dev.yml -p test down

# Run all tests in the backend and create HTML coverage report
backend-test-html:
	make backend-test REPORT="--cov-report=html"

# Export the backend's OpenAPI spec to client/openapi.json without running the server,
# then generate the typed frontend API client from it.
# APP_ENV=dev matches the routes of the dev server; the connection URLs are required but never used.
openapi:
	APP_ENV=dev \
	DB_URL=postgresql+asyncpg://openapi:openapi@localhost/openapi \
	REDIS_URL=redis://localhost \
	CELERY_BROKER_URL=redis://localhost \
	uv run --directory server python -c "import json; from src.main import app; json.dump(app.openapi(), open('../client/openapi.json', 'w'))"
	npm --prefix client run generate:api

# Extract Caddy root CA from production app to trust it locally
extract-caddy-ca:
	docker compose -f docker-compose.yml -p prod cp frontend:/data/caddy/pki/authorities/local/root.crt ./caddy-local-root.crt 
