# Login And Auth Runbook

## Source of truth

- Interactive login uses NextAuth Credentials through `/api/auth/*`
- `app/api/login/route.ts` is deprecated and intentionally returns `410 Gone`
- Session data is issued by NextAuth JWT callbacks in `auth.config.ts`

## Required environment

- `NEXTAUTH_SECRET`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` for rendering the widget
- `TURNSTILE_SECRET_KEY` for enforcing server-side Turnstile verification

## Login flow

1. User submits the login form from `app/login/LoginForm.tsx`
2. Client calls `signIn("credentials")`
3. `auth.ts` runs `authenticateLoginAttempt()` in `lib/login.ts`
4. Server resolves client IP from the incoming request headers
5. Turnstile is verified only when `TURNSTILE_SECRET_KEY` is configured
6. Rate limiting and progressive delay are applied per `ip:username`
7. Successful login writes audit logs and stores role/permissions in the JWT

## Password reset flow

1. User opens `/forgot-password` and submits email or username
2. Server verifies Turnstile when enabled
3. If the account has a usable email, the server sends a reset link through Resend
4. The reset token is signed server-side, expires in 30 minutes, and is tied to the current password hash fingerprint
5. `/reset-password` validates the token before allowing a password change
6. After password reset, the old reset link becomes invalid automatically

## Expected behavior

- Missing username/password returns a validation error
- Invalid credentials return a generic login failure message
- Repeated failures trigger temporary lockout
- Missing Turnstile token only blocks login when server enforcement is enabled
- Admin page/API access is checked through shared helpers in `lib/adminAccess.ts`

## Debug checklist

1. Confirm the login request goes through `/api/auth/callback/credentials`
2. Verify `TURNSTILE_SECRET_KEY` and `NEXT_PUBLIC_TURNSTILE_SITE_KEY` are either both set or both intentionally unset
3. Inspect audit logs for `LOGIN` and `LOGIN_FAILED`
4. Check forwarded IP headers if rate limiting looks inconsistent
5. Confirm the user role exists in the `roles` table and exposes expected permissions
6. For reset-password issues, verify `NEXTAUTH_SECRET` and `RESEND_API_KEY`

## Safe changes

- Change login policy in `lib/login.ts`
- Change route protection in `lib/adminAccess.ts`
- Change session shape in `auth.config.ts`

Avoid reintroducing business logic into `app/api/login/route.ts`.
