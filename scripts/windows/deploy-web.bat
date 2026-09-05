@echo off
pushd "%~dp0..\.."
REM .git is in .dockerignore, so the image cannot look up its own commit,
REM read it here and hand it to the build as GIT_COMMIT (see docker-compose.yml).
for /f "usebackq delims=" %%i in (`git rev-parse --short HEAD`) do set GIT_COMMIT=%%i
for /f "usebackq delims=" %%v in (`node -p "require('./package.json').version"`) do set APP_VERSION=%%v
echo.
echo Building and deploying v%APP_VERSION% (%GIT_COMMIT%)...
docker compose up -d --build web
echo.
echo Done. Press any key to close.
pause >nul
popd
