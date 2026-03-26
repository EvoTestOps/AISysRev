# Architecture

```mermaid
graph TD

    Client["Client (Browser)"]

    subgraph Proxy_Layer ["Frontend Container"]
        Caddy
        React["React App"]
    end

    subgraph Backend ["Backend Logic"]
        FastAPI["FastAPI"]
        Celery["Celery Worker"]
    end

    subgraph Data ["Data"]
        Postgres[("PostgreSQL")]
        Redis[("Redis (Broker/Cache)")]
        MinIO[("MinIO (S3 Storage)")]
    end

    subgraph Tools
        Flower
        Adminer
    end

    Client -- "HTTP :8080" --> Adminer
    Client -- "HTTP :5555" --> Flower
    Client -- "HTTPS :3000" --> Caddy

    Caddy -- "Serves" --> React
    Caddy -- "Proxies /api/*" --> FastAPI

    FastAPI --> Postgres
    FastAPI --> Redis
    FastAPI --> MinIO
    Celery --> Redis
    Celery --> Postgres
```

## Port Mapping

| Service | Port | Container port|
| --------------- | --------------- | --------------- |
| Frontend (https) | 3000 | 9443 |
| Frontend redir (http)| 3080 | 9080 |
| Backend API | --- | 8080 |
| Adminer | 8080  | 8080 |
| Flower | 5555 | 5555|
| MinIO API | 9000 | 9000|
| MinIO Console | 9001 | 9001|
| PostgreSQL | 5432| 5432|
| Redis | 6379 | 6379 |



