@echo off
setlocal EnableExtensions

rem db:push applies the whole accumulated schema diff to whatever DATABASE_URL
rem resolves to. This script exists only for the isolated dev database on port
rem 3308, so it refuses to run unless .env.development.local actually points
rem there. Before 2026-09-05 that file pointed at 3307 - the database the web
rem container serves from - and double-clicking this ran the one command
rem CLAUDE.md forbids against it.

pushd "%~dp0..\.."

set "DEV_ENV_FILE=.env.development.local"

if not exist "%DEV_ENV_FILE%" (
    echo "%DEV_ENV_FILE%" was not found. Not running db:push.
    goto done
)

findstr /R /C:"^DATABASE_URL=.*:3308/" "%DEV_ENV_FILE%" >nul
if errorlevel 1 (
    echo DATABASE_URL in "%DEV_ENV_FILE%" does not point at port 3308.
    echo Refusing to run db:push - it would apply the whole schema diff to
    echo whichever database that URL resolves to.
    goto done
)

echo.
echo Pushing schema to the isolated dev database on port 3308...
set APP_ENV=development
npm run db:push

:done
echo.
echo Done. Press any key to close.
pause >nul
popd
endlocal
