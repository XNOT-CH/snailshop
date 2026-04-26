# NextAuth API Notes

This folder contains the NextAuth route.

## Files

- `[...nextauth]/route.ts`
  NextAuth handler export

## Read with

- `auth.ts`
- `auth.config.ts`
- `lib/auth.ts`
- `proxy.ts`
- `app/login/LoginForm.tsx`

## Watchouts

- Most real auth logic lives in `auth.ts` and `auth.config.ts`, not the route file itself.
