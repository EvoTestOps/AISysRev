# Start dev containers with live reloading and force rebuild (use when dependencies or Dockerfiles change)
dev-build:
	docker compose -f docker-compose-dev.yml up --watch --build

# Start dev containers with live reloading (default development setup)
dev:
	docker compose -f docker-compose-dev.yml up --watch

# Create a new database migration based on model changes
# Usage: make migration-create m="Add new table"
migration-create:
	docker compose -f docker-compose-dev.yml exec backend alembic revision --autogenerate -m "$(m)"

# Apply all unapplied migrations to bring the database up to date
migration-upgrade:
	docker compose -f docker-compose-dev.yml exec backend alembic upgrade head

# Revert the last applied migration (useful for rollback during development)
migration-downgrade:
	docker compose -f docker-compose-dev.yml exec backend alembic downgrade -1

# Show the full history of migrations with details
migration-history:
	docker compose -f docker-compose-dev.yml exec backend alembic history --verbose

# Display the current migration version applied to the database
migration-current:
	docker compose -f docker-compose-dev.yml exec backend alembic current