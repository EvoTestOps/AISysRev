ARG APP_VERSION=dev

FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS client-build
ARG APP_VERSION
ENV VITE_APP_VERSION=$APP_VERSION

WORKDIR /app

COPY client/package.json .
COPY client/package-lock.json .
RUN --mount=type=cache,target=/root/.npm npm ci

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

FROM caddy:2.11.4-alpine@sha256:de23def33b17fb5d1290b0f6c2add1d70780e52341896c00a4c8a2a2fe9d355e AS client
RUN apk add --no-cache libcap && setcap -r /usr/bin/caddy && apk del libcap

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=client-build /app/dist /srv
RUN chgrp -R 0 /srv /etc/caddy && chmod -R g=rX /srv /etc/caddy

FROM ghcr.io/astral-sh/uv:0.12.17 AS uv

FROM python:3.14.7-alpine@sha256:016508ba505da24f7139765bc4bb669df4e88eb2f12eeadd571bf2f88d7533df AS python-base

FROM python-base AS server-builder
ENV UV_LINK_MODE=copy
COPY --from=uv /uv /uvx /bin/

RUN apk add --no-cache git

WORKDIR /app

COPY server/pyproject.toml /app/pyproject.toml
COPY server/uv.lock /app/uv.lock
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --no-install-project --no-editable


FROM python-base AS runtime
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/app/.venv/bin:$PATH"

RUN addgroup -S app && adduser -S app -G app \
    && mkdir /app && chown app:0 /app

WORKDIR /app
COPY --from=server-builder --chown=app:0 /app/.venv /app/.venv
COPY --chown=app:0 --chmod=g=rX server/. /app
RUN chmod +x /app/migrate.sh

ARG APP_VERSION
ENV APP_VERSION=$APP_VERSION

FROM runtime AS server
USER app
CMD ["/bin/sh", "/app/start.sh"]

FROM runtime AS celery
EXPOSE 8080
USER app
CMD ["/bin/sh", "/app/start-celery.sh"]
