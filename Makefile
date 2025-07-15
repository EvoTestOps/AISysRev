start:
	docker compose -f docker-compose.yml up

start-prod:
	APP_ENV=prod docker compose -f docker-compose.yml up

start-dev-test:
	APP_ENV=test docker compose -f docker-compose-dev.yml up

# Start dev containers with live reloading and force rebuild (use when dependencies or Dockerfiles change)
dev-build:
	docker compose -f docker-compose-dev.yml up --watch --build

# Start dev containers with live reloading (default development setup)
dev:
	docker compose -f docker-compose-dev.yml up --watch

# Create a new database migration based on model changes
# Usage: make migration-create m="Add new table"
m-create:
	docker compose -f docker-compose-dev.yml exec backend alembic revision --autogenerate -m "$(m)"

# Apply all unapplied migrations to bring the database up to date
m-up:
	docker compose -f docker-compose-dev.yml exec backend alembic upgrade head

# Show the full history of migrations with details
m-hist:
	docker compose -f docker-compose-dev.yml exec backend alembic history --verbose

# Display the current migration version applied to the database
m-current:
	docker compose -f docker-compose-dev.yml exec backend alembic current