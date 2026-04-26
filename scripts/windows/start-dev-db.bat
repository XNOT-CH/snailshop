@echo off
pushd "%~dp0..\.."
echo.
echo Starting isolated dev database on port 3308...
docker compose up -d app_db_dev
echo.
echo Done. Press any key to close.
pause >nul
popd
