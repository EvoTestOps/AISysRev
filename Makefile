# DEV
# Start dev containers with live reloading and build on startup (default development setup)
start-dev:
	FRONTEND_PORT=3001 FLOWER_PORT=5556 ADMINER_PORT=8081 APP_ENV=dev docker compose -f docker-compose-dev.yml -p dev down
	FRONTEND_PORT=3001 FLOWER_PORT=5556 ADMINER_PORT=8081 APP_ENV=dev docker compose -f docker-compose-dev.yml -p dev up --watch --build
start-dev-debug:
	DEBUG=true FRONTEND_PORT=3001 FLOWER_PORT=5556 ADMINER_PORT=8081 APP_ENV=dev docker compose -f docker-compose-dev.yml -p dev down
	DEBUG=true FRONTEND_PORT=3001 FLOWER_PORT=5556 ADMINER_PORT=8081 APP_ENV=dev docker compose -f docker-compose-dev.yml -p dev up --watch --build
# TEST
start-test:
	FRONTEND_PORT=3002 FLOWER_PORT=5557 ADMINER_PORT=8082 APP_ENV=test FRONTEND_URL=http://localhost:3002 docker compose -f docker-compose-dev.yml -p test down -v
	FRONTEND_PORT=3002 FLOWER_PORT=5557 ADMINER_PORT=8082 APP_ENV=test FRONTEND_URL=http://localhost:3002 docker compose -f docker-compose-dev.yml -p test up --build
start-test-debug:
	DEBUG=true FRONTEND_PORT=3002 FLOWER_PORT=5557 ADMINER_PORT=8082 APP_ENV=test FRONTEND_URL=http://localhost:3002 docker compose -f docker-compose-dev.yml -p test down -v
	DEBUG=true FRONTEND_PORT=3002 FLOWER_PORT=5557 ADMINER_PORT=8082 APP_ENV=test FRONTEND_URL=http://localhost:3002 docker compose -f docker-compose-dev.yml -p test up --build
# PROD
start-prod:
	FRONTEND_PORT=3000 FLOWER_PORT=5555 ADMINER_PORT=8080 APP_ENV=prod docker compose -f docker-compose.yml -p prod down
	FRONTEND_PORT=3000 FLOWER_PORT=5555 ADMINER_PORT=8080 APP_ENV=prod docker compose -f docker-compose.yml -p prod up --build

start-services:
	docker compose -f docker-compose-services.yml down -v
	docker compose -f docker-compose-services.yml up --build
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

# Extract Caddy root CA from production app to trust it locally
extract-caddy-ca:
	docker compose -f docker-compose.yml -p prod cp frontend:/data/caddy/pki/authorities/local/root.crt ./caddy-local-root.crt 
