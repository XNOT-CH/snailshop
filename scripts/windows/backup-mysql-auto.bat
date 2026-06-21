@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem MySQL automatic backup helper for Windows/XAMPP.
rem Keep real passwords out of this file. Put credentials in MYSQL_DEFAULTS_FILE.

set "MYSQLDUMP_EXE=C:\xampp\mysql\bin\mysqldump.exe"
set "MYSQL_EXE=C:\xampp\mysql\bin\mysql.exe"
set "MYSQL_DEFAULTS_FILE=C:\backup\mysql-backup.cnf"
set "DATABASE_NAME=my_game_store"
set "BACKUP_ROOT=C:\backup\mysql"
set "SECONDARY_BACKUP_ROOT="
set "RETENTION_DAYS=30"

if /I "%~1"=="check" goto check
if /I "%~1"=="help" goto help
if /I "%~1"=="--help" goto help
if not "%~1"=="" goto usage

call :timestamp
call :validate_common
if errorlevel 1 exit /b 1

set "BACKUP_DIR=%BACKUP_ROOT%\%TODAY%"
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
if errorlevel 1 (
    echo Failed to create backup directory: "%BACKUP_DIR%"
    exit /b 1
)

set "DATABASE_SAFE=%DATABASE_NAME%"
if /I "%DATABASE_NAME%"=="ALL" set "DATABASE_SAFE=all_databases"
set "DUMP_TEMP=%BACKUP_DIR%\%DATABASE_SAFE%_%NOW%.sql.tmp"
set "DUMP_FILE=%BACKUP_DIR%\%DATABASE_SAFE%_%NOW%.sql"
set "LOG_FILE=%BACKUP_DIR%\backup_%NOW%.log"

call :log "Starting MySQL backup."
call :log "Backup file: %DUMP_FILE%"

if /I "%DATABASE_NAME%"=="ALL" (
    "%MYSQLDUMP_EXE%" --defaults-extra-file="%MYSQL_DEFAULTS_FILE%" --single-transaction --routines --triggers --events --default-character-set=utf8mb4 --hex-blob --all-databases > "%DUMP_TEMP%" 2>> "%LOG_FILE%"
) else (
    "%MYSQLDUMP_EXE%" --defaults-extra-file="%MYSQL_DEFAULTS_FILE%" --single-transaction --routines --triggers --events --default-character-set=utf8mb4 --hex-blob "%DATABASE_NAME%" > "%DUMP_TEMP%" 2>> "%LOG_FILE%"
)

if errorlevel 1 (
    call :log "Backup failed while running mysqldump."
    if exist "%DUMP_TEMP%" del "%DUMP_TEMP%"
    echo Backup failed. See log: "%LOG_FILE%"
    exit /b 1
)

for %%A in ("%DUMP_TEMP%") do set "BACKUP_SIZE=%%~zA"
if "%BACKUP_SIZE%"=="0" (
    call :log "Backup failed because the SQL file is empty."
    del "%DUMP_TEMP%"
    echo Backup failed. SQL file is empty. See log: "%LOG_FILE%"
    exit /b 1
)

move /Y "%DUMP_TEMP%" "%DUMP_FILE%" >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
    call :log "Backup failed while finalizing the SQL file."
    echo Backup failed. See log: "%LOG_FILE%"
    exit /b 1
)

echo %DUMP_FILE%> "%BACKUP_ROOT%\latest.txt"
call :log "Backup complete. Size: %BACKUP_SIZE% bytes."

if not "%SECONDARY_BACKUP_ROOT%"=="" (
    call :copy_secondary
    if errorlevel 1 (
        echo Backup was created, but copying to the secondary location failed. See log: "%LOG_FILE%"
        exit /b 1
    )
)

call :cleanup_old "%BACKUP_ROOT%"
if not "%SECONDARY_BACKUP_ROOT%"=="" call :cleanup_old "%SECONDARY_BACKUP_ROOT%"

echo Backup complete.
echo File: "%DUMP_FILE%"
echo Log:  "%LOG_FILE%"
exit /b 0

:check
call :validate_common
if errorlevel 1 exit /b 1

echo.
echo Backup configuration looks usable.
echo MYSQLDUMP_EXE: "%MYSQLDUMP_EXE%"
echo MYSQL_EXE: "%MYSQL_EXE%"
echo MYSQL_DEFAULTS_FILE: "%MYSQL_DEFAULTS_FILE%"
echo DATABASE_NAME: "%DATABASE_NAME%"
echo BACKUP_ROOT: "%BACKUP_ROOT%"
echo RETENTION_DAYS: "%RETENTION_DAYS%"
echo.
"%MYSQLDUMP_EXE%" --version
if exist "%MYSQL_EXE%" (
    echo.
    echo Testing MySQL connection...
    "%MYSQL_EXE%" --defaults-extra-file="%MYSQL_DEFAULTS_FILE%" --default-character-set=utf8mb4 --execute="SELECT NOW() AS backup_check;"
    if errorlevel 1 (
        echo MySQL connection test failed.
        exit /b 1
    )
) else (
    echo.
    echo MYSQL_EXE not found, so connection test was skipped.
)
echo.
echo Check complete.
exit /b 0

:usage
call :print_usage
exit /b 2

:help
call :print_usage
exit /b 0

:print_usage
echo Usage:
echo   scripts\windows\backup-mysql-auto.bat
echo   scripts\windows\backup-mysql-auto.bat check
echo.
echo Edit the settings at the top of this file before using it.
exit /b 0

:timestamp
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd"') do set "TODAY=%%i"
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format HHmmss"') do set "NOW=%%i"
exit /b 0

:validate_common
if "%MYSQLDUMP_EXE%"=="" (
    echo MYSQLDUMP_EXE is empty.
    exit /b 1
)
if not exist "%MYSQLDUMP_EXE%" (
    echo mysqldump.exe was not found: "%MYSQLDUMP_EXE%"
    echo Edit MYSQLDUMP_EXE at the top of this file.
    exit /b 1
)
if "%MYSQL_DEFAULTS_FILE%"=="" (
    echo MYSQL_DEFAULTS_FILE is empty.
    exit /b 1
)
if not exist "%MYSQL_DEFAULTS_FILE%" (
    echo MySQL defaults file was not found: "%MYSQL_DEFAULTS_FILE%"
    echo Create it from scripts\windows\mysql-backup.defaults.example.cnf.
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

:refuse_drive_root
set "ROOT_CHECK=%~1"
if "%ROOT_CHECK%"=="" exit /b 1
if "%ROOT_CHECK:~-1%"=="\" set "ROOT_CHECK=%ROOT_CHECK:~0,-1%"
if "%ROOT_CHECK:~1%"==":" (
    echo Refusing to use drive root as a backup cleanup path: "%~1"
    exit /b 1
)
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
