@echo off
pushd "%~dp0..\.."
echo.
echo Pushing schema to isolated dev database...
set APP_ENV=development
npm run db:push
echo.
echo Done. Press any key to close.
pause >nul
popd
