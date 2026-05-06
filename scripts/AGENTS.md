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
  uses `scripts/run-next-dev.mjs`, binds to `127.0.0.1`, starts from port `3001`, and auto-picks the next free port when `3001` is busy
- Deploy/config validation:
  `npm run check:deploy`
  runs `scripts/validate-deploy.mjs` and checks required env, encryption/CSRF config, critical drizzle migration metadata, and DB health
- Database health:
  `npm run check:db-health`
  runs `scripts/validate-db-health.mjs`
- Purchase locking verification:
  `npm run check:purchase-locking`
  runs `scripts/verify-purchase-locking.mjs` and writes a temporary product row during the lock handoff check
- Encoding verification:
  `npm run check:encoding`
  runs `scripts/check-encoding.mjs`
- Commerce incident reconciliation:
  `npm run ops:reconcile-commerce`
  runs `scripts/reconcile-commerce.mjs` in read-only mode; use `node scripts/reconcile-commerce.mjs --hours <n>` for a longer lookback window
- Product migration helpers:
  `npm run products:export:dev`
  `npm run products:import:prod`
- Storage/data migrations:
  `npm run db:migrate-sensitive`
  `npm run storage:migrate-slips`
  `npm run storage:migrate-r2`
  `npm run storage:cleanup-legacy-slips`

## Read with

- `package.json`
- `scripts/sonar/AGENTS.md`
- `scripts/windows/AGENTS.md`
- `drizzle/AGENTS.md`
- `lib/db/schema.ts`
