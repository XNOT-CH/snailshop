# Admin Registration Route Notes

The TOS and privacy-policy editors for the signup page. Both pages are one-liners
that render the same client component with a different `type`; all the UI lives in
`components/admin/RegistrationPolicyManager.tsx`.

## Read with

- `components/admin/RegistrationPolicyManager.tsx`
- `app/api/admin/registration-policies/AGENTS.md`
- `lib/getRegistrationPolicies.ts` — what `/register`, `/terms` and `/privacy` read

## Watchouts

- Drag-to-reorder is locked while a search is active or the list is sorted by
  title — see the trap of the same name in `snailshop.md`.
- Gated by `content:view` / `content:edit`, registered in `lib/adminAccess.ts`
  under the `/admin/registration/` prefix.
