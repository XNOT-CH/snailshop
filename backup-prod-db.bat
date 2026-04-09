@echo off
setlocal
pushd "%~dp0"

if not exist "backups" mkdir "backups"

for /f %%i in ('powershell -NoProfile -Command "(Get-Date).ToString(\"yyyy-MM-dd_HH-mm-ss\")"') do set "TS=%%i"
set "BACKUP_FILE=backups\backup_my_game_store_%TS%.sql"

echo.
echo Backing up production database to "%BACKUP_FILE%"...
docker compose exec -T app_db sh -c "mysqldump -uroot -prootpassword my_game_store" > "%BACKUP_FILE%"

if errorlevel 1 (
    echo.
    echo Backup failed.
    if exist "%BACKUP_FILE%" del "%BACKUP_FILE%"
    echo Make sure Docker Desktop is running and the app_db container is healthy.
    echo.
    pause
    popd
    exit /b 1
)

for %%A in ("%BACKUP_FILE%") do set "BACKUP_SIZE=%%~zA"

echo.
echo Backup complete.
echo File: "%BACKUP_FILE%"
echo Size: %BACKUP_SIZE% bytes
echo.
pause
popd
endlocal
