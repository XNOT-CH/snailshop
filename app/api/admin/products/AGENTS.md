# Admin Product API Notes

This folder contains admin-specific product actions.

## Files

- `[id]/duplicate/route.ts`
  Duplicate product
- `[id]/featured/route.ts`
  Toggle featured state

## Read with

- `app/admin/products/page.tsx`
- `components/admin/ProductTable.tsx`
- `lib/features/products/mutations.ts`
- `lib/features/products/queries.ts`
- `lib/db/schema.ts`

## Watchouts

- Product management is split between these admin APIs and public `/api/products/*` handlers.
- Featured and duplicate actions are initiated from the admin product table.
