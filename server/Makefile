start-dev:
	.venv/bin/fastapi dev src/main.py

start:
	fastapi run src/main.py

migrate:
	alembic upgrade head
lint:
	venv/bin/python3 -m mypy --install-types --non-interactive --explicit-package-bases