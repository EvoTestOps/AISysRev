# AISysRev server

FastAPI backend, with Celery workers for the screening jobs, PostgreSQL (with pgvector) for data and Redis as the Celery broker. For setup and running the whole stack see the [main README](../README.md).

## Layout

| Path | Contents |
| --- | --- |
| `src/main.py` | FastAPI app entry point |
| `src/api/controllers/` | HTTP route handlers |
| `src/services/` | Business logic (projects, papers, jobs, LLM calls, PDF screening) |
| `src/crud/` | Database access |
| `src/db/` | SQLAlchemy engine, sessions and models |
| `src/schemas/` | Pydantic request/response schemas |
| `src/core/` | Config, auth, prompts, LLM integration |
| `src/celery/`, `src/worker.py` | Celery app and background tasks |
| `src/tools/` | CSV/EndNote parsing and other helpers |
| `src/tests/` | Backend tests |
| `migrations/` | Alembic migrations |

## Common commands

The server is normally run in containers from the repository root (`make start-dev`, `make backend-test`, `make m-create m="..."`, see the [Makefile](../Makefile)). Linting and type checking run locally from this folder:

```sh
uv sync --locked --all-extras --dev
make lint         # ruff check
make lint-fix     # ruff check --fix
make typecheck    # mypy src
```

## Configuration

Settings are read from environment variables. `.env.example` (for the Docker setup) and `.env.local.example` (for running outside Docker) list the required ones: `APP_ENV`, `SECRET_KEY`, `DB_URL`, `CELERY_BROKER_URL` and `REDIS_URL`.

## Dependencies

Managed with [uv](https://docs.astral.sh/uv/) (`pyproject.toml` and `uv.lock`). See [maintenance.md](../docs/maintenance.md) for how to upgrade them.
