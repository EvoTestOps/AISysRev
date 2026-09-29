FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS client

WORKDIR /app

COPY client/package.json client/package-lock.json ./

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

EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM ghcr.io/astral-sh/uv:0.12.17 AS uv

FROM python:3.14.7-alpine@sha256:9e9fde4d32eedce0b661d9ab91e826b62dddf28e928c230ec55f1866cac66b01 AS python-base

FROM python-base AS server-builder
ENV UV_LINK_MODE=copy
COPY --from=uv /uv /uvx /bin/

RUN apk add --no-cache git

WORKDIR /app

COPY server/pyproject.toml /app/pyproject.toml
COPY server/uv.lock /app/uv.lock
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-install-project --no-editable


FROM python-base AS server
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/app/.venv/bin:$PATH"

COPY --from=uv /uv /uvx /bin/
RUN addgroup -S app && adduser -S app -G app \
    && mkdir -p /app/data/pdfs && chown -R app:app /app

WORKDIR /app
COPY --from=server-builder --chown=app:app /app/.venv /app/.venv
COPY --chown=app:app server/. /app
RUN chmod +x /app/start-dev.sh /app/start-celery-dev.sh /app/migrate.sh

EXPOSE 8080
EXPOSE 5678
USER app

CMD ["/bin/sh", "/app/start-dev.sh"]
