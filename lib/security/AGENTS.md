# Security Logic Notes

This folder contains focused security helpers.

## Files

- `pin.ts`
  PIN validation and protected-action support
- `turnstile.ts`
  Turnstile verification

## Read with

- `lib/auth.ts`
- `lib/csrf.ts`
- `lib/csrf-client.ts`
- `app/api/topup/route.ts`
- `auth.ts`
- `app/login/LoginForm.tsx`

## Watchouts

- PIN logic affects topup and other sensitive user/admin actions.
- Turnstile affects login and bot-protection behavior.
