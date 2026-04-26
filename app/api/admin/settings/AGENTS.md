# Admin Settings API Notes

This folder contains the site settings singleton API.

## Files

- `route.ts`
  Read and update site-wide settings

## Read with

- `app/admin/settings/page.tsx`
- `lib/getSiteSettings.ts`
- `lib/validations/settings.ts`
- `lib/db/singletons.ts`
- `app/layout.tsx`

## Watchouts

- Creates default settings if none exist.
- Updates affect root layout and public branding.
- Audit logging is part of the write path.
