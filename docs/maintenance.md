# Maintenance

How to keep the project's dependencies up to date. [Dependabot](#dependabot) opens weekly PRs for most dependencies. The rest of this document explains how to review those PRs, how to do the same upgrades by hand (majors, security advisories, catching up on a backlog), and the version pins Dependabot doesn't touch.

General rules:

- Upgrade one area at a time (client packages, server packages, base images, CI tooling) and commit them separately, so a regression is easy to bisect and revert.
- Lockfiles (`client/package-lock.json`, `server/uv.lock`) must be committed. The Dockerfiles install with `npm ci` and `uv sync --locked`, so a `package.json`/`pyproject.toml` change without a matching lockfile change breaks the image build.
- Run the [verification checklist](#verification-checklist) before opening a PR. CI runs the same checks (`.github/workflows/tests.yml`).

## Where versions are defined

| What | Where |
| --- | --- |
| Node.js | `.nvmrc`, `engines.node` in `client/package.json`, `FROM node:` in `Dockerfile` and `Dockerfile-dev.dockerfile`, README "Development requirements" |
| Python | `server/.python-version`, `requires-python` and `[tool.mypy] python_version` / `[tool.ruff] target-version` in `server/pyproject.toml`, `FROM python:` in both Dockerfiles (3 stages each), README |
| uv | `COPY --from=ghcr.io/astral-sh/uv:<version>` in both Dockerfiles (several stages), `astral-sh/setup-uv` `version:` in `.github/workflows/tests.yml` (several jobs), README |
| Caddy | `FROM caddy:` in `Dockerfile` |
| Postgres, Redis, Adminer | `image:` in `docker-compose.yml`, `docker-compose-dev.yml`; Redis also in `manifests/*/redis-dep.yaml` |
| GitHub Actions | `uses:` lines in `.github/workflows/*.yml` |
| Client packages | `client/package.json` + `client/package-lock.json` |
| Server packages | `server/pyproject.toml` + `server/uv.lock` |

Whenever you change a version that appears in several places, search for the old value (`grep -rn "0.12.17" --exclude-dir=node_modules --exclude-dir=.venv .`) and update every occurrence. Keep the versions consistent, for example the uv version should be the same in the Dockerfiles, CI and README.

## Dependabot

Configured in [.github/dependabot.yml](../.github/dependabot.yml). Every week it checks these ecosystems:

| Ecosystem | Directory | Covers |
| --- | --- | --- |
| `npm` | `/client` | `package.json`, `package-lock.json` |
| `uv` | `/server` | `pyproject.toml`, `uv.lock` |
| `docker` | `/`, `/manifests/staging`, `/manifests/production` | `FROM` lines in the Dockerfiles (tag and digest), image references in the manifests (the locally built `aisysrev` images are ignored) |
| `docker-compose` | `/` | `image:` in `docker-compose.yml` and `docker-compose-dev.yml` |
| `github-actions` | `/` | `uses:` in `.github/workflows/*.yml` |

Minor and patch updates are grouped into one PR per ecosystem (e.g. one "npm" PR, one "uv" PR). Major updates aren't grouped, so each one arrives as its own PR, which suits the "held back" packages listed below.

Reviewing a Dependabot PR:

1. Wait for CI. The PR runs the same jobs as any other PR (lint, typecheck, unit, backend, build, e2e).
2. Skim the release notes Dependabot links, especially for majors and for `fastapi`, `pydantic`, `pydantic-ai-slim`, `sqlalchemy`, `celery`, `alembic`, `react`, `vite`, `vitest` and `@playwright/test`.
3. For a Docker PR, check that the image is updated everywhere it is used (see the notes under [Docker base images](#docker-base-images)). For example, all three Python stages in a Dockerfile should end up on the same tag.
4. Merge, or push fixes to the PR branch (`@dependabot rebase` re-bases it, `@dependabot ignore this major version` silences a major you're not ready for).
5. Merging to `main` publishes staging images, so check staging before tagging a production release.

What Dependabot does **not** update. Do these by hand:

- **Language runtimes as a set:** `.nvmrc`, `engines.node`, `server/.python-version`, `requires-python`, mypy's `python_version`, ruff's `target-version`, and the README/docs. Dependabot can bump the `python:`/`node:` image tag, but not the rest, so a Python or Node major/minor upgrade is a manual, multi-file change.
- **uv version in CI:** the `astral-sh/setup-uv` `version:` input in `tests.yml` is a plain string. Dependabot only bumps the `setup-uv` action itself.
- **uv version in the Dockerfiles:** `COPY --from=ghcr.io/astral-sh/uv:<version>` may or may not be picked up by the docker ecosystem. If Dependabot PRs don't touch these lines, update them by hand together with CI and the README.
- **Postgres major versions:** Dependabot may propose a new `pgvector/pgvector` tag, but a major bump (pg14 to pg15+) needs a data migration. Don't merge such a PR as is.
- **`gwet-ac1`:** git dependency, `uv lock --upgrade-package gwet-ac1`.
- **Files it may not scan:** after the first Dependabot Docker PR, check that `Dockerfile-dev.dockerfile` was included too. If it wasn't, the dev image pins will drift from `Dockerfile`, so update them by hand.

## Client (npm)

Run from `client/`.

```sh
npm outdated                 # see what is behind (current / wanted / latest)
npm update                   # upgrade within the ranges in package.json (caret ranges), updates package-lock.json
npm install <pkg>@latest     # upgrade one package past its range, rewrites package.json
npm audit                    # known vulnerabilities
```

Notes:

- `npm update` is the safe first step. Majors need `npm install <pkg>@latest` (or edit `package.json` and run `npm install`) and a look at the package's changelog.
- Some packages are intentionally held back and need deliberate migration work: `react`/`react-dom` (18.x), `typescript` (`~5.7`, tilde range), `tailwind-merge` (2.x), `vite` (6.x). `@vitejs/plugin-react` and `vitest` tend to have peer-dependency requirements on `typescript`/`vite`, so upgrade them together.
- `@playwright/test` and `@vitest/browser-playwright` both pull Playwright. After a Playwright upgrade, re-install browsers locally with `npx playwright install --with-deps`. CI does this on every run.
- `@types/node` should track the Node major used in `.nvmrc` (currently 24), not fall behind it.
- Don't hand-edit `package-lock.json`. If it gets into a bad state, delete `node_modules` and run `npm install` again (avoid deleting the lockfile, which re-resolves everything).
- Use the same Node version as CI/Docker (`nvm use`, reads `.nvmrc`), otherwise npm may write a lockfile that differs from what CI expects.

## Server (uv)

Run from `server/`. Dependencies are declared in `pyproject.toml` (mostly `>=` lower bounds), and the exact resolved versions live in `uv.lock`.

```sh
uv tree --outdated --depth 1      # direct dependencies that have newer versions
uv lock --upgrade                 # re-resolve everything to the newest allowed versions
uv lock --upgrade-package <pkg>   # upgrade just one package (and what it needs)
uv sync --all-extras --dev        # install the lockfile into .venv
```

Notes:

- Because constraints are lower bounds, `uv lock --upgrade` can jump a major version. Read `git diff server/uv.lock` for version changes on packages you care about (`fastapi`, `pydantic`, `pydantic-ai-slim`, `sqlalchemy`, `celery`, `openai`, `alembic`, `pandas`).
- Raise the lower bound in `pyproject.toml` only when the code needs the newer version (new API or security fix), then re-run `uv lock`.
- `gwet-ac1` is a git dependency (`[tool.uv.sources]`), pinned by commit in `uv.lock`. To pick up new upstream commits run `uv lock --upgrade-package gwet-ac1`.
- `ruff` and `mypy` are pinned via the lockfile, so upgrading them can produce new lint/type errors. Fix these in the same PR (`make lint-fix` autofixes some).
- After changing dependencies, rebuild the containers (`make start-dev` builds with `--build`). The Docker images install from `uv.lock`, so this also verifies that the lockfile is valid inside the image.
- If a dependency upgrade changes SQLAlchemy models or Alembic behavior, check `make m-create m="check"` doesn't generate an unexpected migration (delete the generated file if it does not belong).

## Docker base images

Base images in `Dockerfile` and `Dockerfile-dev.dockerfile` are pinned by tag **and** sha256 digest (`node:24-alpine@sha256:...`) for reproducible builds. Dependabot updates these (see above). When doing it by hand, update both the tag and the digest, since a tag alone would not change the digest. The same applies to the Postgres, Redis and Adminer images in the compose files and Redis in `manifests/`.

To get the current digest of a tag (the multi-arch index digest, which is what should be pinned):

```sh
docker buildx imagetools inspect python:3.14-alpine | head -n 3
# Name:      docker.io/library/python:3.14-alpine
# MediaType: application/vnd.oci.image.index.v1+json
# Digest:    sha256:...
```

Pin to the most specific tag you can (`python:3.14.7-alpine`, `caddy:2.11.4-alpine`, `redis:7.4.5-alpine`) followed by the digest. Node is pinned to the major (`node:24-alpine`) plus digest, so a refresh means updating the digest only.

Per image:

- **Node** (`node:*-alpine`): appears twice in the Dockerfiles (`client-build` in `Dockerfile`, `client` in `Dockerfile-dev.dockerfile`). Keep the major in sync with `.nvmrc`.
- **Python** (`python:*-alpine`): appears once in each Dockerfile (the `python-base` stage). A patch bump (3.14.x) only needs the Dockerfiles. A minor bump (3.14 to 3.15) also needs `server/.python-version`, `requires-python`, `[tool.mypy] python_version`, `[tool.ruff] target-version`, the README, and a full `uv lock --upgrade` since wheels for all dependencies must exist for the new version. Alpine uses musl, so a package without musl wheels will compile from source and can fail to build. Check the Docker build early.
- **uv** (`ghcr.io/astral-sh/uv:<version>`): pinned to an exact version (not `latest`) in the `uv` stage of both Dockerfiles. Update both, plus the `setup-uv` `version:` in every job in `tests.yml`, plus the "UV vX or later" line in the README. Release notes: https://github.com/astral-sh/uv/releases. A new uv can change lockfile formatting, so run `uv lock` and commit any diff.
- **Caddy** (`caddy:*-alpine`): the `client` stage of `Dockerfile`. The `Caddyfile` in the repo root is copied in, so check it still loads (`docker run --rm -v $PWD/Caddyfile:/etc/caddy/Caddyfile caddy:<ver> caddy validate --config /etc/caddy/Caddyfile`).
- **Postgres** (`pgvector/pgvector:pg14`): a **major** version change (pg14 to pg15+) cannot reuse an existing data directory. It needs a dump/restore or `pg_upgrade`, and the manifests/volumes in production must be planned separately. Only bump the digest for the same major. In dev, `postgres-init-scripts/` is mounted on first init (`docker-compose-dev.yml`), so check they still work.
- **Redis** (`redis:7.4.x-alpine`): used by Celery. Update all three places (`docker-compose.yml`, `docker-compose-dev.yml`, `manifests/{staging,production}/redis-dep.yaml`) together.
- **Adminer**: dev/admin tool, low risk.

After changing a Dockerfile, build every target that the workflows build. The `server` image also runs the Celery worker and Flower (compose and the Kubernetes manifests override the command):

```sh
docker build --target server  -t aisysrev-server .
docker build --target client  -t aisysrev-client .
```

`make start-prod` also does a full production build and is the closest to what gets deployed.

## GitHub Actions

Workflows in `.github/workflows/` reference actions by major version tag (`actions/checkout@v5`, `actions/setup-node@v7`, `docker/build-push-action@v7`, ...). Dependabot proposes these upgrades. To do it by hand, check each action's releases page, bump the tag, and check the input names haven't changed. `tests.yml` is reused by `build-prod.yml` and `build-staging.yml` through `workflow_call`, so a broken test workflow blocks image publishing.

The Node and Python versions in CI come from `.nvmrc` and `server/.python-version`, so those don't need editing in the workflow.

## Verification checklist

Client (from `client/`):

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

Server (from `server/`):

```sh
uv sync --locked --all-extras --dev
make lint
make typecheck
```

Full stack (from the repo root):

```sh
make backend-unit     # unit tests in containers
make backend-test     # all backend tests, including DB migrations
make start-test       # start the test stack (frontend at :3002), leave it running
cd client && npx playwright test    # e2e, in another terminal, requires the test stack
```

Finally, smoke-test the images the way they get deployed with `make start-prod` (or at least build the images as shown above) and click through login, creating a project, importing papers and running a screening.

## Releasing the upgrade

- Open a PR against `main`. CI runs lint, typecheck, unit, backend, build and e2e jobs.
- Merging to `main` runs the tests and pushes staging images (`build-staging.yml`). Tags matching `v*.*.*` push production images (`build-prod.yml`). Let an upgrade run on staging before tagging a production release (see [releasing.md](releasing.md)).
- Mention notable major-version upgrades and any manual steps (e.g. Postgres major upgrade) in the PR description.
