# Contributing

Thanks for helping improve AISysRev. This page covers the day-to-day workflow. For what the project is and how to run it, see the [README](README.md), and for how the system fits together see [docs/architecture.md](docs/architecture.md).

## Setup

Install the [development requirements](README.md#development-requirements) (Node.js, Python, Docker and uv), then start the development stack:

```sh
make start-dev
```

The app is then at https://localhost:3001. Changes to `client/` and `server/` are synced into the containers, so the app reloads as you edit. See [Running in development mode](README.md#running-in-development-mode) for the other URLs (API docs, Adminer) and the debug mode.

## Workflow

1. Create a branch from `main`, named `feature/<short-description>` or `fix/<short-description>` (prefix with the issue number if there is one, e.g. `feature/42-job-api`).
2. Make your change in small commits. Commit messages are short imperative sentences, e.g. `Fix type errors` or `Add server typecheck job`.
3. Run the [checks](#checks-before-opening-a-pull-request) locally.
4. Open a pull request against `main`. CI runs the same checks, and merging to `main` publishes staging images (see [docs/maintenance.md](docs/maintenance.md#releasing-the-upgrade)).

## Checks before opening a pull request

Client, from `client/`:

```sh
npm run lint
npm run typecheck
npm test
```

Server, from `server/`:

```sh
make lint         # ruff
make typecheck    # mypy
```

Backend tests, from the repository root (they run in containers):

```sh
make backend-unit    # unit tests only, faster
make backend-test    # all backend tests, including migrations
```

End-to-end tests need the test stack running:

```sh
cd client && npm run test:e2e     # this starts the test stack automatically.
```

The e2e tests in `client/e2e/` are named by what they exercise: `*.api.spec.ts` only call the API, and `*.e2e.spec.ts` drive the browser. Add e2e coverage when you add or change a user-visible flow.

## Database changes

Change the SQLAlchemy models in `server/src/db/models/`, then generate a migration with the dev stack running:

```sh
make m-create m="Describe the change"
```

Read the generated file in `server/migrations/versions/` before committing it, since autogenerate misses some changes (for example enum edits and data migrations). Migrations are applied automatically when the backend starts.

## Dependencies

Dependabot opens weekly upgrade PRs. Review them, and do manual upgrades, as described in [docs/maintenance.md](docs/maintenance.md). Commit lockfile changes (`client/package-lock.json`, `server/uv.lock`) together with the manifest change.

## Releasing

Production images are published when a `vX.Y.Z` tag is pushed. See [docs/releasing.md](docs/releasing.md) for how to tag and create a GitHub release.

## Documentation

Update the docs in the same pull request as the change that makes them wrong. The docs have drifted before because nothing tied them to the code.

See [When to update what](docs/README.md#when-to-update-what) for which doc goes with which kind of change.

Other documentation rules:

- Docs live in [docs/](docs/) (see the [index](docs/README.md)), use lowercase kebab-case file names, and put diagrams and images in `docs/images/`.
- Draw diagrams with Mermaid inside the markdown file when possible, so they diff and review like text.
- Link to the file that holds the truth (a compose file, `pyproject.toml`) instead of copying values into prose where you can.
- If you add a doc, add it to [docs/README.md](docs/README.md).
- Check that relative links still work after moving or renaming a file.
