start-dev:
	.venv/bin/fastapi dev src/main.py

start:
	fastapi run src/main.py

migrate:
	alembic upgrade head
lint:
	uv run ruff check
lint-fix:
	uv run ruff check --fix