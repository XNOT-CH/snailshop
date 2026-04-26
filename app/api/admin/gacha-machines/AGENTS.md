# Admin Gacha Machine API Notes

This folder contains machine management APIs for gacha admin.

## Files

- `route.ts`
  List/create machines
- `reorder/route.ts`
  Persist machine order
- `upload-image/route.ts`
  Upload machine image
- `[id]/route.ts`
  Update/delete a machine
- `[id]/duplicate/route.ts`
  Duplicate machine

## Read with

- `app/admin/gacha-machines/page.tsx`
- `app/admin/gacha-machines/[id]/edit/page.tsx`
- `app/api/admin/gacha-rewards/route.ts`
- `lib/gachaMachineProbability.ts`
- `lib/gachaCost.ts`
- `lib/validations/gacha.ts`
- `lib/db/schema.ts`

## Watchouts

- Machine activation and cost normalization are cross-cutting concerns.
- Reorder and duplicate flows are separate APIs from create/update.
