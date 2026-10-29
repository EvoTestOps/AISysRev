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

The server only runs in containers. Settings are read from environment variables, which the compose files in the repository root set for each service; there are no dotenv files. The required ones are `APP_ENV`, `SECRET_KEY`, `DB_URL`, `CELERY_BROKER_URL` and `REDIS_URL`; the rest are optional, with defaults in [src/core/config.py](src/core/config.py).

### Database connections

The API keeps a connection pool: each API process holds at most `DB_POOL_SIZE` + `DB_POOL_MAX_OVERFLOW` connections (default 10 + 10), and a request that finds the pool full waits for a free connection. Celery workers, migrations and the tests don't pool and open a new connection per session, because each Celery job runs in its own event loop and an asyncpg connection can't move between event loops (see [src/db/session.py](src/db/session.py)).

All of them share PostgreSQL's `max_connections`: 50 in the production and local stack ([docker-compose.yml](../docker-compose.yml)), PostgreSQL's default of 100 in the others. Keep the number of API processes (Kubernetes replicas, uvicorn workers) × 20, plus Celery's connections, below it. Celery uses up to one connection per running screening task, and a worker process runs at most 20 tasks at a time.

## Dependencies

Managed with [uv](https://docs.astral.sh/uv/) (`pyproject.toml` and `uv.lock`). See [maintenance.md](../docs/maintenance.md) for how to upgrade them.
