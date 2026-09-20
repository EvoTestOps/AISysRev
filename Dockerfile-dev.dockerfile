FROM node:25-alpine@sha256:bdf2cca6fe3dabd014ea60163eca3f0f7015fbd5c7ee1b0e9ccb4ced6eb02ef4 AS client

WORKDIR /app

COPY client/package.json client/package-lock.json ./

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

EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM python:3.14.7-alpine@sha256:016508ba505da24f7139765bc4bb669df4e88eb2f12eeadd571bf2f88d7533df AS server-builder
COPY --from=ghcr.io/astral-sh/uv:0.12.17 /uv /uvx /bin/

RUN apk add --no-cache git

WORKDIR /app

COPY server/pyproject.toml /app/pyproject.toml
COPY server/uv.lock /app/uv.lock
RUN uv sync --locked --no-install-project --no-editable


FROM python:3.14.7-alpine@sha256:016508ba505da24f7139765bc4bb669df4e88eb2f12eeadd571bf2f88d7533df AS server
COPY --from=ghcr.io/astral-sh/uv:0.12.17 /uv /uvx /bin/
RUN addgroup -S app && adduser -S app -G app

WORKDIR /app
COPY --from=server-builder --chown=app:app /app/.venv /app/.venv

COPY server/. /app
RUN chown -R app:app /app
RUN chown app:app /app/start-dev.sh && chmod +x /app/start-dev.sh
RUN chown app:app /app/migrate.sh && chmod +x /app/migrate.sh
RUN mkdir -p /app/data/pdfs && chown app:app /app/data/pdfs

EXPOSE 8080
EXPOSE 5678
USER app
CMD ["/bin/sh", "/app/start-dev.sh"]

FROM python:3.14.7-alpine@sha256:016508ba505da24f7139765bc4bb669df4e88eb2f12eeadd571bf2f88d7533df AS celery
COPY --from=ghcr.io/astral-sh/uv:0.12.17 /uv /uvx /bin/

RUN addgroup -S celerygroup && adduser -S celeryuser -G celerygroup

WORKDIR /app
COPY --from=server-builder --chown=celeryuser:celerygroup /app/.venv /app/.venv

COPY server/. /app
RUN chown -R celeryuser:celerygroup /app
RUN chown celeryuser:celerygroup /app/start-celery-dev.sh && chmod +x /app/start-celery-dev.sh
RUN mkdir -p /app/data/pdfs && chown celeryuser:celerygroup /app/data/pdfs

EXPOSE 8080
EXPOSE 5678

USER celeryuser
CMD ["/bin/sh", "/app/start-celery-dev.sh"]
