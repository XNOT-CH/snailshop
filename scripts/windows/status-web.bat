@echo off
pushd "%~dp0..\.."
echo.
echo Current container status:
docker compose ps
echo.
echo Press any key to close.
pause >nul
popd
