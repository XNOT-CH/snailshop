# Admin Slips API Notes

This folder contains admin slip review APIs.

## Files

- `route.ts`
  Approve or reject pending topup
- `[id]/image/route.ts`
  Secure image access for stored proof images

## Read with

- `app/admin/slips/page.tsx`
- `components/admin/SlipTable.tsx`
- `app/api/topup/route.ts`
- `lib/sensitiveData.ts`
- `lib/slipStorage.ts`
- `lib/auth.ts`
- `lib/permissions.ts`

## Watchouts

- Approving a slip also credits user balance.
- Access should respect admin permission checks, not just authenticated state.
