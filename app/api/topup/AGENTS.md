# Topup API Notes

This folder contains the main user topup submission handler.

## Files

- `route.ts`
  Accepts topup request, verifies slip, stores result, may auto-approve or fall back to pending

## Read with

- `app/dashboard/topup/page.tsx`
- `app/admin/slips/page.tsx`
- `app/api/admin/slips/route.ts`
- `app/api/admin/easyslip-info/route.ts`
- `lib/validations/topup.ts`
- `lib/serverImageUpload.ts`
- `lib/slipStorage.ts`
- `lib/security/pin.ts`
- `lib/rateLimit.ts`
- `lib/sensitiveData.ts`

## Watchouts

- Multiple input methods are supported.
- Uses external EasySlip endpoints and fallback behavior.
- May store pending topups for admin review instead of instant approval.
