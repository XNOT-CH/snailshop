# Admin Settings Notes

This folder is the admin surface for site-wide branding and global settings.

## Files

- `page.tsx`
  Branding, banners, logo, OG image, background, homepage toggles

## Read with

- `app/api/admin/settings/route.ts`
- `lib/getSiteSettings.ts`
- `lib/validations/settings.ts`
- `lib/db/singletons.ts`
- `app/layout.tsx`
- `lib/seo.ts`

## Watchouts

- Site settings behave like a singleton record.
- Changes here affect root layout, metadata, and public homepage UI.
- Many fields accept uploaded files or direct URLs.
