# Windows Script Notes

This folder contains Windows-specific helper scripts.

## Rules

- Keep Windows assumptions here instead of mixing them into cross-platform scripts.

## Known helpers

- `dev-web.bat`
  starts `npm run dev`
- `start-web.bat`
  starts Docker Compose services `web` and `app_db`
- `stop-web.bat`
  stops Docker Compose services `web` and `app_db`
- `status-web.bat`
  runs `docker compose ps`
- `deploy-web.bat`
  rebuilds and starts the `web` service with Docker Compose
- `start-dev-db.bat`
  starts isolated dev DB service `app_db_dev` on port `3308`
- `stop-dev-db.bat`
  stops isolated dev DB service `app_db_dev`
- `db-push-dev.bat`
  sets `APP_ENV=development` then runs `npm run db:push`
- `db-studio-dev.bat`
  sets `APP_ENV=development` then runs `npm run db:studio`
- `backup-prod-db.bat`
  runs `mysqldump` inside `app_db` and writes SQL backups under `backups/`

## Watchout

- Some `.bat` helpers shell out to Docker Compose, so verify Docker Desktop and the expected compose files are available before relying on them.
