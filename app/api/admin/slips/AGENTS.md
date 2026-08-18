# Admin Topup Code Usage API Notes

This folder's `route.ts` no longer approves/rejects bank-transfer slips — it now serves a read-only, paginated log of who redeemed CREDIT-type promo codes.

## Files

- `route.ts`
  GET: paginated/filterable list of `PromoUsage` rows for `codeType = "CREDIT"` promo codes, plus summary stats
- `[id]/image/route.ts`
  Unrelated legacy endpoint — still serves stored bank-transfer proof images for `lib/features/dashboard/topupSummary.ts`. Do not remove.

## Read with

- `app/(site)/admin/slips/page.tsx`
- `components/admin/TopupCodeUsageTable.tsx`
- `lib/features/promo/queries.ts`
- `app/api/promo-codes/redeem/route.ts`
- `lib/permissions.ts`

## Watchouts

- Access should respect admin permission checks (`PERMISSIONS.TOPUP_CODE_VIEW`), not just authenticated state.
- No approve/reject actions live here anymore — redemption credits balance instantly in `/api/promo-codes/redeem`.
