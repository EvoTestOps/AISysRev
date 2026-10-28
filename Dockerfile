ARG APP_VERSION=dev

FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS client-build
ARG APP_VERSION
ENV VITE_APP_VERSION=$APP_VERSION

WORKDIR /app

COPY client/package.json .
COPY client/package-lock.json .
RUN --mount=type=cache,target=/root/.npm npm ci

COPY client/.oxlintrc.json .
COPY client/.oxfmtrc.json .
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

FROM caddy:2.11.7-alpine@sha256:eb4d35b7452d1ab6171fbdbe8d9275b2301dad6dad92115d91e19fb9b24d510f AS client
RUN apk add --no-cache libcap && setcap -r /usr/bin/caddy && apk del libcap

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=client-build /app/dist /srv
RUN chgrp -R 0 /srv /etc/caddy && chmod -R g=rX /srv /etc/caddy

FROM ghcr.io/astral-sh/uv:0.13.5 AS uv

FROM python:3.15.0-alpine@sha256:2699b90f4d562a22e2dd076c82f964032f64814204bff36d271a54ba4cc2c7e2 AS python-base

FROM python-base AS server-builder
ENV UV_LINK_MODE=copy
COPY --from=uv /uv /uvx /bin/

RUN apk add --no-cache git

WORKDIR /app

COPY server/pyproject.toml /app/pyproject.toml
COPY server/uv.lock /app/uv.lock
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --no-install-project --no-editable


FROM python-base AS server
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/app/.venv/bin:$PATH"

# The PDF directory exists in the image so that a fresh volume mounted on it
# starts out writable by the app user, not owned by root.
RUN addgroup -S app && adduser -S app -G app \
    && mkdir -p /app/data/pdfs && chown -R app:0 /app && chmod -R g=u /app/data

WORKDIR /app
COPY --from=server-builder --chown=app:0 /app/.venv /app/.venv
COPY --chown=app:0 --chmod=g=rX server/. /app
RUN chmod +x /app/migrate.sh

ARG APP_VERSION
ENV APP_VERSION=$APP_VERSION

USER app
CMD ["/bin/sh", "/app/start.sh"]
