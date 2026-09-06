# Register Route Notes

This folder contains the registration page.

## Read with

- `app/api/register/AGENTS.md`
- `lib/validations/auth.ts`
- `lib/auth.ts`

## Watchouts

- The TOS/PP clauses are read in a dialog (`components/auth/PolicyDialog.tsx`),
  not inline on the form. Inline they doubled the form's length and added a tab
  stop per clause before the submit button. The consent checkbox and what the
  API is sent (`acceptedPolicies`) did not change.
- The two links live inside the checkbox's `<label>`, so their click handlers
  must keep calling `preventDefault()` or opening a policy also toggles consent.
