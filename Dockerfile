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

COPY server/migrations ./migrations

RUN npm run build

FROM caddy:2.10.0-alpine@sha256:ae4458638da8e1a91aafffb231c5f8778e964bca650c8a8cb23a7e8ac557aa3c AS client

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=client-build /app/dist /srv

EXPOSE 80
EXPOSE 443

FROM python:3.13-alpine@sha256:9ba6d8cbebf0fb6546ae71f2a1c14f6ffd2fdab83af7fa5669734ef30ad48844 AS server

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=/app
WORKDIR /app

COPY server/ .

RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 8080

WORKDIR /app/src
CMD ["python",  "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]

FROM python:3.13-alpine@sha256:9ba6d8cbebf0fb6546ae71f2a1c14f6ffd2fdab83af7fa5669734ef30ad48844 AS celery

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=/app
RUN addgroup -S celerygroup && adduser -S celeryuser -G celerygroup

WORKDIR /app

COPY server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server/ .

RUN chown -R celeryuser:celerygroup /app
USER celeryuser

CMD ["python", "-m", "celery", "-A", "src.worker", "worker", "--loglevel=info"]