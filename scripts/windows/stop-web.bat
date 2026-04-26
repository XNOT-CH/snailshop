@echo off
pushd "%~dp0..\.."
echo.
echo Stopping web and database containers...
docker compose stop web app_db
echo.
echo Done. Press any key to close.
pause >nul
popd
