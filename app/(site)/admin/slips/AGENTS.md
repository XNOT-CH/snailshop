# Admin Topup Code Usage Notes

This folder is the admin audit surface for who has redeemed CREDIT-type promo codes (topup codes).

## Files

- `page.tsx`
  Client page: fetches summary cards + paginated usage log from the API and renders search/status filters

## Read with

- `components/admin/TopupCodeUsageTable.tsx`
- `app/api/admin/slips/route.ts`
- `lib/features/promo/queries.ts`
- `app/api/promo-codes/redeem/route.ts`
- `lib/permissions.ts`

## Watchouts

- Read-only audit log — redemption already completes instantly in `/api/promo-codes/redeem`, there is no approve/reject step here.
- This route/page path (`/admin/slips`) is legacy naming kept to avoid breaking bookmarks; it no longer reviews bank-transfer slips.
- Bank-transfer slip storage/review (`lib/slipStorage.ts`, `app/api/admin/slips/[id]/image/route.ts`) is unrelated and still used by the topup dashboard summary — do not delete it from this folder's cleanup.
