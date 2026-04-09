# Database Cleanup Plan

This cleanup is intentionally phased to avoid impacting live features.

## Phase 1: Safe Removal

Completed in `codex/database-testing`:

- Removed the legacy `Session` table from [schema.ts](/C:/Users/USER/my-game-store/lib/db/schema.ts)
- Removed unused legacy session helper at [lib/session.ts](/C:/Users/USER/my-game-store/lib/session.ts)
- Removed legacy session unit test at [tests/lib/session.test.ts](/C:/Users/USER/my-game-store/tests/lib/session.test.ts)

Why this is safe:

- Runtime auth already uses NextAuth JWT sessions in [auth.ts](/C:/Users/USER/my-game-store/auth.ts)
- The public route [app/api/session/route.ts](/C:/Users/USER/my-game-store/app/api/session/route.ts) is already disabled and returns `410`
- Live production and dev databases both had `Session = 0` rows during audit

## Tables Still Under Review

These are not removed yet:

- `ApiKey`
- `ChatQuickReply`

Reason:

- They still have code paths or admin APIs in the repo
- They are empty now, but removal should be done in a separate pass after product confirmation

## Recommended SQL Rollout For Phase 1

Run backup first, then drop only after code deploy is stable.

```sql
CREATE TABLE Session_backup_20260409 LIKE Session;
INSERT INTO Session_backup_20260409 SELECT * FROM Session;

DROP TABLE Session;
```

## Recommended Verification After Deploy

1. Login still works with NextAuth
2. Logout still works
3. Dashboard pages still load for authenticated users
4. No code imports `@/lib/session`
5. No unexpected SQL errors mentioning `Session`

## Phase 2 Candidate Cleanup

Only after confirmation:

1. Audit `ApiKey` end-to-end
2. Audit `ChatQuickReply` end-to-end
3. Remove unused tables from schema
4. Backup and drop the physical tables
