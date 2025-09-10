set FRONTEND_PORT=3000
set FLOWER_PORT=5555
set ADMINER_PORT=8080
set APP_ENV=prod

docker compose -f docker-compose.yml -p prod up --build