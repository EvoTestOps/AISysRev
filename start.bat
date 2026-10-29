set FLOWER_PORT=5555
set ADMINER_PORT=8080
set LOCAL_ENV=true

docker compose -f docker-compose.yml -p local down
rem Open the app in the browser once it answers (set NO_BROWSER=1 to skip).
rem Any HTTP response counts: Caddy shows a startup page until the backend is up.
if not defined NO_BROWSER start "" /b powershell -NoProfile -Command "for ($i = 0; $i -lt 240; $i++) { curl.exe -sk -o NUL https://localhost:3000; if ($LASTEXITCODE -eq 0) { Start-Process https://localhost:3000; break }; Start-Sleep 1 }"

docker compose -f docker-compose.yml -p local up --build
