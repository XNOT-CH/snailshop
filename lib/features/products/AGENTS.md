# Product Feature Logic Notes

This folder contains grouped product query/mutation helpers.

## Files

- `queries.ts`
  Read helpers
- `mutations.ts`
  Write helpers
- `shared.ts`
  Shared payload/value builders

## Read with

- `app/admin/products/page.tsx`
- `app/admin/products/[id]/edit/page.tsx`
- `app/api/products/[id]/route.ts`
- `app/api/admin/products/[id]/featured/route.ts`
- `lib/stock.ts`
- `lib/encryption.ts`
- `lib/db/schema.ts`

## Watchouts

- Not all product behavior is centralized here; some still lives in route/page files.
- Shared builders affect create and update behavior together.
