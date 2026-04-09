@echo off
pushd "%~dp0"
echo.
echo Opening Drizzle Studio for isolated dev database...
set APP_ENV=development
npm run db:studio
popd
