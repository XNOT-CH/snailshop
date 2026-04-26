# Topup Page Notes

This folder is the user-facing topup flow.

## Files

- `page.tsx`
  Main topup UI, slip input modes, PIN confirmation, submit flow

## Read with

- `app/api/topup/route.ts`
- `app/admin/slips/page.tsx`
- `components/admin/SlipTable.tsx`
- `lib/validations/topup.ts`
- `lib/slipStorage.ts`
- `lib/serverImageUpload.ts`
- `lib/security/pin.ts`
- `lib/require-pin-for-action.ts`
- `lib/rateLimit.ts`

## Watchouts

- Supports image, payload, base64, and URL verification methods.
- Uses CSRF-aware fetch and PIN-protected action flow.
- Some payment channel UI exists before full backend support.
