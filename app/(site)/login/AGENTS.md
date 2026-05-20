# Login Route Notes

This folder is the UI entry for sign-in.

## Files

- `page.tsx`
  Server page entry, loads site branding
- `LoginForm.tsx`
  Main client form, submit behavior, user-facing login UX

## Read with

- `app/api/login/route.ts`
- `app/api/auth/[...nextauth]/route.ts`
- `auth.ts`
- `auth.config.ts`
- `lib/auth.ts`
- `lib/validations/auth.ts`
- `lib/security/turnstile.ts`
- `proxy.ts`

## Watchouts

- UI branding comes from site settings.
- Login rules are split across UI, custom API, and NextAuth credentials flow.
- Route access after login may still be redirected by `proxy.ts`.
