@echo off
pushd "%~dp0"
echo.
echo Stopping isolated dev database...
docker compose stop app_db_dev
echo.
echo Done. Press any key to close.
pause >nul
popd
