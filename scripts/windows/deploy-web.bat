@echo off
pushd "%~dp0..\.."
echo.
echo Building and deploying the latest web container...
docker compose up -d --build web
echo.
echo Done. Press any key to close.
pause >nul
popd
