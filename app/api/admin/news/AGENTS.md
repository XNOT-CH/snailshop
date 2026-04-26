# Admin News API Notes

This folder contains admin news CRUD APIs.

## Files

- `route.ts`
  List/create news
- `[id]/route.ts`
  Update/delete/reorder/toggle per article behavior

## Read with

- `app/admin/news/page.tsx`
- `app/api/news/route.ts`
- `lib/newsValidation.ts`
- `lib/validations/content.ts`
- `lib/cache.ts`
- `lib/db/schema.ts`

## Watchouts

- Public-facing news also depends on cache freshness.
- Validation and normalization are important for title, description, URL, and image input.
