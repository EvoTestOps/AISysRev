FROM node:22-alpine@sha256:10962e8568729b0cfd506170c5a2d1918a2c10ac08c0e6900180b4bac061adc9 AS client-build

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

FROM nginx:alpine@sha256:b2e814d28359e77bd0aa5fed1939620075e4ffa0eb20423cc557b375bd5c14ad AS client

COPY --from=client-build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

FROM python:3.13-alpine@sha256:9b4929a72599b6c6389ece4ecbf415fd1355129f22bb92bb137eea098f05e975 AS server

WORKDIR /app

COPY server/ .

RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 8080

WORKDIR /app/src
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]