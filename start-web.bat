@echo off
pushd "%~dp0"
echo.
echo Starting web and database containers...
docker compose up -d web app_db
echo.
echo Done. Press any key to close.
pause >nul
popd
