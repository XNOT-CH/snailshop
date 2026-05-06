# Script Notes

This folder contains project maintenance, validation, migration, and operational scripts.

## Use this folder for

- dev/build helpers
- DB/data migration scripts
- export/import tools
- Sonar and ops scripts

## Common commands

- Dev server:
  `npm run dev`
  uses `scripts/dev/run-next-dev.mjs`, binds to `127.0.0.1`, starts from port `3001`, and auto-picks the next free port when `3001` is busy
- Deploy/config validation:
  `npm run check:deploy`
  runs `scripts/deploy/validate-deploy.mjs` and checks required env, encryption/CSRF config, critical drizzle migration metadata, and DB health
- Database health:
  `npm run check:db-health`
  runs `scripts/db/validate-db-health.mjs`
- Purchase locking verification:
  `npm run check:purchase-locking`
  runs `scripts/ops/verify-purchase-locking.mjs` and writes a temporary product row during the lock handoff check
- Encoding verification:
  `npm run check:encoding`
  runs `scripts/quality/check-encoding.mjs`
- Commerce incident reconciliation:
  `npm run ops:reconcile-commerce`
  runs `scripts/ops/reconcile-commerce.mjs` in read-only mode; use `node scripts/ops/reconcile-commerce.mjs --hours <n>` for a longer lookback window
- Product migration helpers:
  `npm run products:export:dev`
  `npm run products:import:prod`
- Storage/data migrations:
  `npm run db:migrate-sensitive`
  `npm run storage:migrate-slips`
  `npm run storage:migrate-r2`
  `npm run storage:cleanup-legacy-slips`

## Subfolder map

- `dev/`
  Local development helpers
- `deploy/`
  Deployment readiness validation
- `db/`
  Database health checks and shared DB script utilities
- `admin/`
  Admin maintenance helpers
- `exports/`
  Export helper scripts
- `ops/`
  Operational verification and incident support scripts
- `products/`
  Product export/import sync scripts
- `quality/`
  Repository quality checks
- `storage/`
  Runtime storage migration and cleanup scripts
- `seeds/`
  Local or controlled-environment seed scripts
- `windows/`
  Windows command wrappers
- `sonar/`
  SonarQube scan and report helpers

## Read with

- `package.json`
- `scripts/sonar/AGENTS.md`
- `scripts/windows/AGENTS.md`
- `drizzle/AGENTS.md`
- `lib/db/schema.ts`
