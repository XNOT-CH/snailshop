# Admin Gacha Machines Notes

This folder is the admin surface for managing gacha machines.

## Files

- `page.tsx`
  Main machine list, add form, reorder, toggle, duplicate, upload
- `[id]/edit/page.tsx`
  Per-machine edit flow

## Read with

- `app/api/admin/gacha-machines/route.ts`
- `app/api/admin/gacha-machines/[id]/route.ts`
- `app/api/admin/gacha-machines/[id]/duplicate/route.ts`
- `app/api/admin/gacha-machines/reorder/route.ts`
- `app/api/admin/gacha-machines/upload-image/route.ts`
- `app/api/admin/gacha-rewards/route.ts`
- `lib/gachaMachineProbability.ts`
- `lib/gachaCost.ts`
- `lib/validations/gacha.ts`
- `lib/db/schema.ts`

## Watchouts

- Activation may depend on probability completeness.
- This page is a heavy client control surface with direct fetch calls.
- Cost type normalization matters when saving.
