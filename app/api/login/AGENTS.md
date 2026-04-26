# Login API Notes

This folder contains the custom login endpoint.

## Files

- `route.ts`
  Validates login payload, checks user/password, rate-limits attempts, writes audit log

## Read with

- `app/login/page.tsx`
- `app/login/LoginForm.tsx`
- `app/api/auth/[...nextauth]/route.ts`
- `auth.ts`
- `lib/validations/auth.ts`
- `lib/rateLimit.ts`
- `lib/auditLog.ts`

## Watchouts

- This is not the only login path; NextAuth credentials flow also exists.
- Changes here may not fully change login behavior if the UI uses NextAuth directly.
