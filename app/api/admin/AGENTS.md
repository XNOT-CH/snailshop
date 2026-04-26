# Admin API Notes

This folder contains admin-only APIs.

## Main rule

When tracing admin behavior, pair three layers:

1. Admin page in `app/admin/*`
2. API here in `app/api/admin/*`
3. Access control in `lib/adminAccess.ts`, `lib/auth.ts`, `lib/permissions.ts`

## Read first by task

- Products:
  `products/AGENTS.md`
- Users:
  `users/AGENTS.md`
- Settings:
  `settings/AGENTS.md`
- News:
  `news/AGENTS.md`
- Slips:
  `slips/AGENTS.md`
- Gacha:
  `gacha-machines/AGENTS.md`

## Watchouts

- Required permission can differ per route prefix.
- Some admin APIs are exact-path mapped in `lib/adminAccess.ts`.
- Admin UI visibility should never be treated as the source of truth for access.
