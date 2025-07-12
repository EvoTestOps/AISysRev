FROM node:22-alpine AS client-build

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

FROM nginx:alpine AS client

COPY --from=client-build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

FROM python:3.13-alpine AS server

WORKDIR /app

COPY server/ .

RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 8080

WORKDIR /app/src
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]