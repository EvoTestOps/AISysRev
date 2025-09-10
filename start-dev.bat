set FRONTEND_PORT=3001
set FLOWER_PORT=5556
set ADMINER_PORT=8081
set APP_ENV=dev

docker compose -f docker-compose.yml -p dev up --build