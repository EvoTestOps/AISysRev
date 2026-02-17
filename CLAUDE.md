# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AISysRev is a web application for AI-assisted systematic literature review, specifically for title-abstract screening. The application stores all data locally and accesses LLMs through OpenRouter, OpenAI, or local providers.

## Technology Stack

**Frontend:** TypeScript, React 18, Vite, Wouter (routing), easy-peasy (state), Zod (validation), Tailwind CSS, Material UI
**Backend:** Python 3.14, FastAPI, SQLAlchemy (async), Alembic (migrations), PostgreSQL, Redis
**Task Queue:** Celery with Redis broker
**Storage:** MinIO (S3-compatible)
**Package Management:** npm (client), uv (server)
**Containerization:** Docker Compose with multi-environment support (dev/test/prod)

## Essential Commands

### Development

```bash
# Start development environment with live reloading
make start-dev
# Frontend: http://localhost:3001
# Backend: http://localhost:8080
# API Docs: http://localhost:3001/documentation
# Adminer (DB): http://localhost:8081

# Start production environment
make start-prod
# Application: https://localhost

# Start test environment (isolated containers)
make start-test
```

### Testing

**Frontend tests** (run in `client/`):
```bash
npm test                # Unit and component tests
npm run test:watch      # Watch mode
npm run coverage        # Coverage report
npm run test:e2e        # Playwright e2e tests
npm run test:browser    # Browser-based tests
```

**Backend tests** (run from root):
```bash
make backend-test           # All tests with coverage
make backend-test-html      # Tests + HTML coverage report
make backend-unit           # Unit tests only
```

**Backend tests via Docker** (when containers are running):
```bash
# From server directory
uv run pytest -m unit -v -s --cov=src              # Unit tests
uv run pytest -m asyncio -v -s --cov=src           # Async/integration tests
```

### Code Quality

**Frontend** (run in `client/`):
```bash
npm run lint        # ESLint
npm run typecheck   # TypeScript type checking
```

**Backend** (run in `server/`):
```bash
uv run ruff check .     # Linting
uv run ruff format .    # Code formatting
```

### Database Migrations

All migration commands are scoped to the dev environment:
```bash
make m-create m="Description"   # Create new migration
make m-up                       # Apply all pending migrations
make m-current                  # Show current migration version
make m-hist                     # Show migration history
```

## Architecture

### Monorepo Structure

```
AISysRev/
├── client/          # React frontend
│   └── src/
│       ├── pages/          # Page components (routing)
│       ├── components/     # Reusable UI components
│       ├── state/          # easy-peasy store and models
│       ├── services/       # API client functions
│       ├── helpers/        # Utility functions
│       └── llm/           # LLM-related logic
├── server/          # FastAPI backend
│   ├── migrations/         # Alembic database migrations
│   └── src/
│       ├── api/controllers/    # FastAPI route handlers
│       ├── services/           # Business logic layer
│       ├── crud/              # Database operations
│       ├── db/models/         # SQLAlchemy models
│       ├── schemas/           # Pydantic schemas
│       ├── celery/            # Celery task definitions
│       ├── core/              # Config, prompts, LLM clients
│       ├── redis_client/      # Redis pub/sub
│       └── tools/             # Utilities (MinIO, diagnostics)
└── data/            # Demo data and mock data
```

### Backend Architecture

**Request Flow:** Controller → Service → CRUD → Database

- **Controllers** ([server/src/api/controllers/](server/src/api/controllers/)): FastAPI routers with route handlers
- **Services** ([server/src/services/](server/src/services/)): Business logic, orchestration
- **CRUD** ([server/src/crud/](server/src/crud/)): Direct database operations with SQLAlchemy
- **Models** ([server/src/db/models/](server/src/db/models/)): SQLAlchemy ORM models
- **Schemas** ([server/src/schemas/](server/src/schemas/)): Pydantic models for request/response validation

**Key Patterns:**
- Dependency injection via `Depends(get_db_ctx)` provides `DBContext`
- All database operations use async SQLAlchemy
- Transactions are committed in controllers after service calls
- Event-driven updates via Redis pub/sub to frontend

**Background Tasks:**
- Celery workers ([server/src/celery/tasks.py](server/src/celery/tasks.py)) handle LLM screening jobs
- Tasks are parallelized for high throughput (>100 papers/minute)
- Redis serves as both Celery broker and event queue

### Frontend Architecture

**State Management:** easy-peasy (Redux-based)
- Global store at [client/src/state/store.ts](client/src/state/store.ts)
- Models define state slices with actions and thunks
- Access via `useTypedStoreState` and `useTypedStoreActions` hooks

**Routing:** Wouter (lightweight React router)
- Route definitions in [client/src/App.tsx](client/src/App.tsx)
- Page components in [client/src/pages/](client/src/pages/)

**API Communication:**
- Service functions in [client/src/services/](client/src/services/) wrap axios calls
- Base API client in [client/src/services/api.ts](client/src/services/api.ts)
- `/api` is proxied to backend in development

**Real-time Updates:**
- Server-Sent Events via [client/src/components/EventStream.tsx](client/src/components/EventStream.tsx)
- Event names in [server/src/event_queue.py](server/src/event_queue.py) must stay in sync with client
- Backend pushes events to Redis, which streams to frontend via SSE endpoint

### Docker Environment Isolation

The application uses Docker Compose with the `-p` flag for environment isolation:
- **dev**: Frontend on port 3001, hot reloading enabled
- **test**: Frontend on port 3002, isolated containers with volume cleanup
- **prod**: Frontend on port 3000, optimized builds, Caddy reverse proxy

Each environment has separate containers (postgres_dev, postgres_test, etc.) to prevent interference.

## Development Workflow

1. **Adding a New Feature:**
   - Backend: Create controller → service → CRUD → model/schema
   - Frontend: Add service function → update store model → create/update components
   - If state changes, emit events via `push_event()` for real-time updates

2. **Database Schema Changes:**
   - Modify models in [server/src/db/models/](server/src/db/models/)
   - Create migration: `make m-create m="Description"`
   - Review generated migration in [server/migrations/versions/](server/migrations/versions/)
   - Apply: `make m-up`

3. **Adding LLM Screening Logic:**
   - Core prompts in [server/src/core/prompts.py](server/src/core/prompts.py)
   - LLM clients in [server/src/core/llm/](server/src/core/llm/)
   - Task definitions in [server/src/celery/tasks.py](server/src/celery/tasks.py)

4. **Testing:**
   - Backend: Use pytest markers (`-m unit` or `-m asyncio`)
   - Frontend: Vitest for unit tests, Playwright for e2e
   - Always run tests in isolated test environment for integration tests

## Important Notes

- **Never commit with real credentials:** Use `.env.example` as template
- **CSV Import:** The tool expects Scopus CSV format (Document title, DOI, Abstract, Authors, Source title)
- **Python Version:** Requires Python 3.14 (specified in [server/.python-version](server/.python-version))
- **Node Version:** Requires Node.js v22 LTS (specified in [.nvmrc](.nvmrc))
- **Event Sync:** Keep [server/src/event_queue.py](server/src/event_queue.py) event definitions synchronized with [client/src/components/EventStream.tsx](client/src/components/EventStream.tsx)
- **Docker Compose:** Always use `docker compose` (not `docker-compose`) - v2.33.1+ required
- **uv Package Manager:** All Python dependencies managed via `uv` - do not use pip directly
