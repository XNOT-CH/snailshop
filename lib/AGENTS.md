# Lib Map

This folder is the main logic layer.

## High-value files

- Auth helpers:
  `auth.ts`, `lib/auth.ts`, `auth.config.ts`
- Permissions:
  `lib/permissions.ts`, `lib/adminAccess.ts`
- Database:
  `lib/db/schema.ts`, `lib/db/index.ts`, `lib/db.ts`
- Validation:
  `lib/validations/*`
- Security:
  `lib/security/*`, `lib/csrf.ts`, `lib/csrf-client.ts`, `lib/rateLimit.ts`

## Subfolder map

- `db/`
  schema and DB setup
- `features/`
  grouped business logic for selected domains
- `validations/`
  Zod schemas
- `security/`
  PIN, Turnstile, and security-specific logic
- `actions/`
  action helpers for user/pin flows
- `utils/`
  low-level utilities

## Read first by task

- Login/auth/session:
  `auth.ts`, `auth.config.ts`, `lib/auth.ts`, `lib/permissions.ts`
- Admin access:
  `lib/adminAccess.ts`, `lib/permissions.ts`, `lib/auth.ts`
- Products:
  `lib/features/products/queries.ts`, `lib/features/products/mutations.ts`, `lib/stock.ts`, `lib/encryption.ts`
- Topup/slips:
  `lib/validations/topup.ts`, `lib/sensitiveData.ts`, `lib/slipStorage.ts`, `lib/serverImageUpload.ts`, `lib/security/pin.ts`
- Settings/content:
  `lib/getSiteSettings.ts`, `lib/cache.ts`, `lib/newsValidation.ts`, `lib/validations/content.ts`, `lib/validations/settings.ts`
- Gacha:
  `lib/gachaExecution.ts`, `lib/gachaGrid.ts`, `lib/gachaMachineProbability.ts`, `lib/gachaProbability.ts`, `lib/gachaCost.ts`

## Database anchors

When tracing data, start in `lib/db/schema.ts`.

Most common tables:

- `users`
- `roles`
- `products`
- `orders`
- `topups`
- `siteSettings`
- `newsArticles`
- `gachaMachines`
- `gachaRewards`

## Watchouts

- Decimal DB fields often arrive as strings and need conversion in UI.
- Some features split logic between `lib/features/*` and route/page files.
- Permission dependencies expand automatically in `lib/permissions.ts`.
