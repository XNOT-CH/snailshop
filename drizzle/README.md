# Migration Notes

This project is currently running on a MySQL schema that still carries legacy
Prisma-era table definitions in several places, especially `varchar(191)` IDs
and older index / constraint names.

## Current baseline

- `npm run db:migrate` is the supported way to apply schema changes.
- Migrations `0003_ambitious_bushwacker.sql` and `0004_quick_chatbox.sql` were
  normalized to work against the current local database state.
- Some tables in `lib/db/schema.ts` are still stricter / newer than the live
  schema. Query code should avoid assuming all historic databases are already
  fully normalized.

## Rules for future migrations

- Prefer forward-only migrations.
- Avoid editing already-applied migrations unless the chain is broken and you
  are intentionally repairing local/dev history.
- When touching legacy tables, prefer SQL that is safe against partially
  migrated states.
- Be careful with foreign keys and ID column lengths. The live database still
  uses `varchar(191)` broadly.
- If a migration renames or replaces an index, make sure the old and new states
  can both be handled safely.

## Recommended workflow

1. Update `lib/db/schema.ts`.
2. Generate or write the migration.
3. Run `npm run db:migrate` on local MySQL.
4. Verify the changed routes/pages against the migrated database.
