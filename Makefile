# DEV
# Start dev containers with live reloading and build on startup (default development setup)
start-dev:
	FRONTEND_PORT=3001 FLOWER_PORT=5556 ADMINER_PORT=8081 APP_ENV=dev docker compose -f docker-compose-dev.yml -p dev down -v
	FRONTEND_PORT=3001 FLOWER_PORT=5556 ADMINER_PORT=8081 APP_ENV=dev docker compose -f docker-compose-dev.yml -p dev up --watch --build
# TEST
start-test:
	FRONTEND_PORT=3002 FLOWER_PORT=5557 ADMINER_PORT=8082 APP_ENV=test docker compose -f docker-compose-dev.yml -p test down -v
	FRONTEND_PORT=3002 FLOWER_PORT=5557 ADMINER_PORT=8082 APP_ENV=test docker compose -f docker-compose-dev.yml -p test up --build
# PROD
start-prod:
	FRONTEND_PORT=3000 FLOWER_PORT=5555 ADMINER_PORT=8080 APP_ENV=prod docker compose -f docker-compose.yml -p prod down
	FRONTEND_PORT=3000 FLOWER_PORT=5555 ADMINER_PORT=8080 APP_ENV=prod docker compose -f docker-compose.yml -p prod up --build

# Create a new database migration based on model changes
# Usage: make migration-create m="Add new table"
# Migration commands here should only be run against the development environment
m-create:
	APP_ENV=dev docker compose -f docker-compose-dev.yml -p dev exec backend alembic revision --autogenerate -m "$(m)"

# Apply all unapplied migrations to bring the database up to date
m-up:
	APP_ENV=dev docker compose -f docker-compose-dev.yml -p dev exec backend alembic upgrade head

# Show the full history of migrations with details
m-hist:
	APP_ENV=dev docker compose -f docker-compose-dev.yml -p dev exec backend alembic history --verbose

# Display the current migration version applied to the database
m-current:
	APP_ENV=dev docker compose -f docker-compose-dev.yml -p dev exec backend alembic current

# Run unit tests
backend-unit:
	APP_ENV=test RUN_DB_MIGRATIONS=false docker compose -f docker-compose-dev.yml -p test run --rm --no-deps backend python3 -m pytest -m unit -v -s --cov=src
	APP_ENV=test docker compose -f docker-compose-dev.yml -p test down

# Run all tests in the backend
backend-test-other:
	APP_ENV=test docker compose -f docker-compose-dev.yml -p test up -d backend postgres redis celery
	APP_ENV=test RUN_DB_MIGRATIONS=true docker compose -f docker-compose-dev.yml -p test run --rm backend python3 -m pytest -m asyncio -v -s --cov=src $(REPORT)
	APP_ENV=test docker compose -f docker-compose-dev.yml -p test down

# Run all tests in the backend and create HTML coverage report
backend-test-html:
	make backend-test REPORT="--cov-report=html"

# Extract Caddy root CA from production app to trust it locally
extract-caddy-ca:
	docker compose -f docker-compose.yml -p prod cp frontend:/data/caddy/pki/authorities/local/root.crt ./caddy-local-root.crt 