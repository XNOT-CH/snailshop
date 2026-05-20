# Admin Products Notes

This folder is the admin surface for product management.

## Files

- `page.tsx`
  Product list and stock summary
- `new/page.tsx`
  Create flow
- `trash/page.tsx`
  Trash / deleted product workflow
- `[id]/edit/page.tsx`
  Edit flow
- `[id]/stock/page.tsx`
  Stock management

## Read with

- `components/admin/ProductTable.tsx`
- `components/admin/ProductImageGalleryField.tsx`
- `app/api/products/[id]/route.ts`
- `app/api/products/[id]/stock/route.ts`
- `app/api/admin/products/[id]/featured/route.ts`
- `app/api/admin/products/[id]/duplicate/route.ts`
- `lib/features/products/queries.ts`
- `lib/features/products/mutations.ts`
- `lib/stock.ts`
- `lib/db/schema.ts`

## Watchouts

- Stock is derived from encrypted `secretData`.
- Some actions use public product APIs, others use admin APIs.
- Permission checks differ between viewing, creating, editing, and deleting.
