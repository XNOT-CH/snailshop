# Topup API Notes

This folder contains the main user topup submission handler.

## Files

- `route.ts`
  Accepts topup request, verifies with EasySlip API v2, stores proof image, and creates an approved topup after verified success

## Read with

- `app/(site)/dashboard/topup/page.tsx`
- `app/(site)/admin/slips/page.tsx`
- `app/api/admin/slips/route.ts`
- `lib/validations/topup.ts`
- `lib/serverImageUpload.ts`
- `lib/slipStorage.ts`
- `lib/security/pin.ts`
- `lib/rateLimit.ts`
- `lib/sensitiveData.ts`

## Watchouts

- Multiple input methods are supported.
- Use only EasySlip API v2 endpoints under `https://api.easyslip.com/v2`.
- Do not approve without server-side CSRF/auth, PIN checks, duplicate checks, and audit logging.
- Keep `EASYSLIP_API_KEY` server-side only.
