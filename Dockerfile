FROM node:22-alpine@sha256:1b2479dd35a99687d6638f5976fd235e26c5b37e8122f786fcd5fe231d63de5b AS client-build

WORKDIR /app

COPY client/package.json .
COPY client/package-lock.json .
RUN npm ci

COPY client/eslint.config.js .
COPY client/index.html .
COPY client/postcss.config.js .
COPY client/tailwind.config.js .
COPY client/tsconfig.json .
COPY client/tsconfig.app.json .
COPY client/tsconfig.node.json .
COPY client/vite.config.ts .

COPY client/public ./public
COPY client/src ./src

RUN npm run build

FROM caddy:2.10.0-alpine@sha256:ae4458638da8e1a91aafffb231c5f8778e964bca650c8a8cb23a7e8ac557aa3c AS client

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=client-build /app/dist /srv

EXPOSE 443

FROM python:3.14-alpine AS server-builder
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

COPY server/pyproject.toml /app/pyproject.toml
COPY server/uv.lock /app/uv.lock
RUN uv sync --locked --no-install-project --no-editable


FROM python:3.14-alpine AS server

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
RUN addgroup -S app && adduser -S app -G app

WORKDIR /app
COPY --from=server-builder --chown=app:app /app/.venv /app/.venv


COPY server/. /app
RUN chown -R app:app /app
RUN chown app:app /app/start-dev.sh && chmod +x /app/start-dev.sh
RUN chown app:app /app/migrate.sh && chmod +x /app/migrate.sh

USER app
CMD ["/bin/sh", "/app/start.sh"]

FROM python:3.14-alpine AS celery
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

RUN addgroup -S celerygroup && adduser -S celeryuser -G celerygroup

WORKDIR /app
COPY --from=server-builder --chown=celeryuser:celerygroup /app/.venv /app/.venv

COPY server/. /app
RUN chown -R celeryuser:celerygroup /app

EXPOSE 8080
USER celeryuser
CMD ["/bin/sh", "/app/start-celery.sh"]