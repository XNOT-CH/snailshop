@echo off
setlocal EnableExtensions

rem Docker MySQL automatic backup helper for Windows.
rem The MySQL app password is read from the running Docker container env and is not printed.

set "COMPOSE_SERVICE=app_db"
set "DATABASE_NAME=my_game_store"
set "BACKUP_ROOT=C:\backup\docker-mysql"
rem F: is a different physical disk from C:, so a dead disk does not take the
rem backups with it. This was empty until 2026-09-05, which meant every copy
rem lived on the same drive as the data it was backing up.
set "SECONDARY_BACKUP_ROOT=F:\backup\docker-mysql"
set "RETENTION_DAYS=30"

rem The uploads are not in the database and cannot be regenerated: product and
rem gacha images, banners, chat media and payment slips. They are archived next
rem to the SQL dump so one dated folder restores the whole site.
set "UPLOAD_DIRS=storage public\uploads"

if /I "%~1"=="check" goto check
if /I "%~1"=="help" goto help
if /I "%~1"=="--help" goto help
if not "%~1"=="" goto usage

pushd "%~dp0..\.."
call :timestamp
call :validate_common
if errorlevel 1 (
    popd
    exit /b 1
)
call :capture_mysql_credentials
if errorlevel 1 (
    popd
    exit /b 1
)

set "BACKUP_DIR=%BACKUP_ROOT%\%TODAY%"
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
if errorlevel 1 (
    echo Failed to create backup directory: "%BACKUP_DIR%"
    popd
    exit /b 1
)

set "DATABASE_SAFE=%DATABASE_NAME%"
if /I "%DATABASE_NAME%"=="ALL" set "DATABASE_SAFE=all_databases"
set "DUMP_TEMP=%BACKUP_DIR%\%DATABASE_SAFE%_%NOW%.sql.tmp"
set "DUMP_FILE=%BACKUP_DIR%\%DATABASE_SAFE%_%NOW%.sql"
set "LOG_FILE=%BACKUP_DIR%\backup_%NOW%.log"

call :log "Starting Docker MySQL backup."
call :log "Compose service: %COMPOSE_SERVICE%"
call :log "Backup file: %DUMP_FILE%"

if /I "%DATABASE_NAME%"=="ALL" (
    docker compose exec -T -e "MYSQL_PWD=%MYSQL_BACKUP_PASSWORD%" "%COMPOSE_SERVICE%" mysqldump "-u%MYSQL_BACKUP_USER%" --single-transaction --routines --triggers --no-tablespaces --default-character-set=utf8mb4 --hex-blob --all-databases > "%DUMP_TEMP%" 2>> "%LOG_FILE%"
) else (
    docker compose exec -T -e "MYSQL_PWD=%MYSQL_BACKUP_PASSWORD%" "%COMPOSE_SERVICE%" mysqldump "-u%MYSQL_BACKUP_USER%" --single-transaction --routines --triggers --no-tablespaces --default-character-set=utf8mb4 --hex-blob "%DATABASE_NAME%" > "%DUMP_TEMP%" 2>> "%LOG_FILE%"
)

if errorlevel 1 (
    call :log "Backup failed while running mysqldump inside Docker."
    if exist "%DUMP_TEMP%" del "%DUMP_TEMP%"
    echo Backup failed. See log: "%LOG_FILE%"
    popd
    exit /b 1
)

for %%A in ("%DUMP_TEMP%") do set "BACKUP_SIZE=%%~zA"
if "%BACKUP_SIZE%"=="0" (
    call :log "Backup failed because the SQL file is empty."
    del "%DUMP_TEMP%"
    echo Backup failed. SQL file is empty. See log: "%LOG_FILE%"
    popd
    exit /b 1
)

move /Y "%DUMP_TEMP%" "%DUMP_FILE%" >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
    call :log "Backup failed while finalizing the SQL file."
    echo Backup failed. See log: "%LOG_FILE%"
    popd
    exit /b 1
)

echo %DUMP_FILE%> "%BACKUP_ROOT%\latest.txt"
call :log "Backup complete. Size: %BACKUP_SIZE% bytes."

call :archive_uploads
if errorlevel 1 (
    echo Database backup was created, but archiving the uploads failed. See log: "%LOG_FILE%"
    popd
    exit /b 1
)

if not "%SECONDARY_BACKUP_ROOT%"=="" (
    call :copy_secondary
    if errorlevel 1 (
        echo Backup was created, but copying to the secondary location failed. See log: "%LOG_FILE%"
        popd
        exit /b 1
    )
)

call :cleanup_old "%BACKUP_ROOT%"
if not "%SECONDARY_BACKUP_ROOT%"=="" call :cleanup_old "%SECONDARY_BACKUP_ROOT%"

echo Backup complete.
echo File: "%DUMP_FILE%"
echo Log:  "%LOG_FILE%"
popd
exit /b 0

:check
pushd "%~dp0..\.."
call :validate_common
if errorlevel 1 (
    popd
    exit /b 1
)
call :capture_mysql_credentials
if errorlevel 1 (
    popd
    exit /b 1
)

echo.
echo Docker backup configuration looks usable.
echo COMPOSE_SERVICE: "%COMPOSE_SERVICE%"
echo DATABASE_NAME: "%DATABASE_NAME%"
echo MYSQL_USER: "%MYSQL_BACKUP_USER%"
echo BACKUP_ROOT: "%BACKUP_ROOT%"
echo RETENTION_DAYS: "%RETENTION_DAYS%"
echo.
docker compose exec -T "%COMPOSE_SERVICE%" mysqldump --version
if errorlevel 1 (
    echo mysqldump is not available in the container.
    popd
    exit /b 1
)
echo.
echo Testing MySQL connection inside Docker...
docker compose exec -T -e "MYSQL_PWD=%MYSQL_BACKUP_PASSWORD%" "%COMPOSE_SERVICE%" mysql "-u%MYSQL_BACKUP_USER%" --execute="SELECT NOW() AS backup_check;"
if errorlevel 1 (
    echo MySQL connection test failed.
    popd
    exit /b 1
)
echo.
echo Check complete.
popd
exit /b 0

:usage
call :print_usage
exit /b 2

:help
call :print_usage
exit /b 0

:print_usage
echo Usage:
echo   scripts\windows\backup-docker-mysql-auto.bat
echo   scripts\windows\backup-docker-mysql-auto.bat check
echo.
echo Start Docker Desktop and the app_db compose service before using it.
exit /b 0

:timestamp
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd"') do set "TODAY=%%i"
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format HHmmss"') do set "NOW=%%i"
exit /b 0

:validate_common
where docker >nul 2>&1
if errorlevel 1 (
    echo docker was not found. Install Docker Desktop or make sure docker is on PATH.
    exit /b 1
)
docker compose version >nul 2>&1
if errorlevel 1 (
    echo docker compose is not available.
    exit /b 1
)
docker compose exec -T "%COMPOSE_SERVICE%" true >nul 2>&1
if errorlevel 1 (
    echo Docker compose service "%COMPOSE_SERVICE%" is not running.
    echo Run scripts\windows\start-web.bat or docker compose up -d %COMPOSE_SERVICE% first.
    exit /b 1
)
if "%BACKUP_ROOT%"=="" (
    echo BACKUP_ROOT is empty.
    exit /b 1
)
call :refuse_drive_root "%BACKUP_ROOT%"
if errorlevel 1 exit /b 1
if not exist "%BACKUP_ROOT%" mkdir "%BACKUP_ROOT%"
if errorlevel 1 (
    echo Failed to create BACKUP_ROOT: "%BACKUP_ROOT%"
    exit /b 1
)
exit /b 0

:capture_mysql_credentials
set "MYSQL_BACKUP_USER="
set "MYSQL_BACKUP_PASSWORD="
for /f "delims=" %%U in ('docker compose exec -T "%COMPOSE_SERVICE%" printenv MYSQL_USER') do set "MYSQL_BACKUP_USER=%%U"
for /f "delims=" %%P in ('docker compose exec -T "%COMPOSE_SERVICE%" printenv MYSQL_PASSWORD') do set "MYSQL_BACKUP_PASSWORD=%%P"
if "%MYSQL_BACKUP_USER%"=="" (
    echo MYSQL_USER was not found in Docker service "%COMPOSE_SERVICE%".
    exit /b 1
)
if "%MYSQL_BACKUP_PASSWORD%"=="" (
    echo MYSQL_PASSWORD was not found in Docker service "%COMPOSE_SERVICE%".
    exit /b 1
)
exit /b 0

:refuse_drive_root
set "ROOT_CHECK=%~1"
if "%ROOT_CHECK%"=="" exit /b 1
if "%ROOT_CHECK:~-1%"=="\" set "ROOT_CHECK=%ROOT_CHECK:~0,-1%"
if "%ROOT_CHECK:~1%"==":" (
    echo Refusing to use drive root as a backup cleanup path: "%~1"
    exit /b 1
)
exit /b 0

:archive_uploads
set "UPLOADS_FILE=%BACKUP_DIR%\uploads_%NOW%.zip"
call :log "Archiving uploads: %UPLOAD_DIRS%"
powershell -NoProfile -Command "$ErrorActionPreference='Stop'; $dirs = '%UPLOAD_DIRS%'.Split(' ') | Where-Object { Test-Path $_ }; if (-not $dirs) { throw 'None of the upload directories exist.' }; Compress-Archive -Path $dirs -DestinationPath '%UPLOADS_FILE%' -CompressionLevel Optimal -Force" >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
    call :log "Failed to archive the uploads."
    set "UPLOADS_FILE="
    exit /b 1
)
for %%A in ("%UPLOADS_FILE%") do call :log "Uploads archived. Size: %%~zA bytes."
exit /b 0

:copy_secondary
call :refuse_drive_root "%SECONDARY_BACKUP_ROOT%"
if errorlevel 1 exit /b 1
set "SECONDARY_DIR=%SECONDARY_BACKUP_ROOT%\%TODAY%"
if not exist "%SECONDARY_DIR%" mkdir "%SECONDARY_DIR%"
if errorlevel 1 (
    call :log "Could not create secondary backup directory: %SECONDARY_DIR%"
    exit /b 1
)
copy /Y "%DUMP_FILE%" "%SECONDARY_DIR%\" >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
    call :log "Could not copy backup to secondary location."
    exit /b 1
)
if not "%UPLOADS_FILE%"=="" (
    copy /Y "%UPLOADS_FILE%" "%SECONDARY_DIR%\" >> "%LOG_FILE%" 2>&1
    if errorlevel 1 (
        call :log "Could not copy the uploads archive to secondary location."
        exit /b 1
    )
)
call :log "Copied backup to secondary location: %SECONDARY_DIR%"
exit /b 0

:cleanup_old
set "CLEANUP_ROOT=%~1"
if "%CLEANUP_ROOT%"=="" exit /b 0
if not exist "%CLEANUP_ROOT%" exit /b 0
call :refuse_drive_root "%CLEANUP_ROOT%"
if errorlevel 1 exit /b 1
forfiles /p "%CLEANUP_ROOT%" /d -%RETENTION_DAYS% /c "cmd /c if @isdir==TRUE rd /s /q @path" >> "%LOG_FILE%" 2>nul
exit /b 0

:log
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format s"') do set "LOG_TS=%%i"
echo [%LOG_TS%] %~1>> "%LOG_FILE%"
exit /b 0
