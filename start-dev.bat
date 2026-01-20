set FRONTEND_PORT=3000
set FLOWER_PORT=5555
set ADMINER_PORT=8080
set APP_ENV=dev

docker compose -f docker-compose.yml -p dev up --build