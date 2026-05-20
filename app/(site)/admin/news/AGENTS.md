# Admin News Notes

This folder is the admin surface for news articles and promotional content.

## Files

- `page.tsx`
  Client-heavy management UI for news CRUD, order, visibility, and uploads

## Read with

- `app/api/admin/news/route.ts`
- `app/api/admin/news/[id]/route.ts`
- `app/api/news/route.ts`
- `lib/newsValidation.ts`
- `lib/validations/content.ts`
- `components/NewsSection.tsx`
- `lib/cache.ts`

## Watchouts

- This page contains substantial behavior inline, not just presentational UI.
- Reordering, toggling visibility, and uploads all live close to the page code.
- Cache invalidation matters for public news display.
