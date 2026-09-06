# Admin Registration Policies API Notes

This folder contains the TOS / privacy-policy admin APIs. One table backs both
lists; the `?type=TOS|PP` query param (POST body for writes) picks which one.

## Read with

- `app/(site)/admin/registration/AGENTS.md`
- `lib/getRegistrationPolicies.ts` — the public reader the signup page,
  `/terms` and `/privacy` share
- `lib/validations/content.ts` — `registrationPolicySchema` and friends

## Watchouts

- PUT uses `registrationPolicyUpdateSchema` (built with `partialUpdateSchema`),
  never `.partial()`, or a lone `isActive` toggle also writes `sortOrder: 0`.
- Every mutating handler must call `invalidateRegistrationPolicyCaches()`.
