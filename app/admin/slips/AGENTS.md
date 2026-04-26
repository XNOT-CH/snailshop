# Admin Slips Notes

This folder is the admin review surface for pending topup slips.

## Files

- `page.tsx`
  Loads pending slips, summary cards, and table view

## Read with

- `components/admin/SlipTable.tsx`
- `app/api/admin/slips/route.ts`
- `app/api/admin/slips/[id]/image/route.ts`
- `app/api/topup/route.ts`
- `lib/sensitiveData.ts`
- `lib/slipStorage.ts`
- `lib/permissions.ts`

## Watchouts

- Approval updates user balance.
- Pending slips are decrypted before being shown.
- Proof image URLs are built through slip-storage helpers.
