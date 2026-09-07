# Admin Invite Codes API Notes

Create and edit the marketing invite links, and read their per-code numbers
(clicks, signups, lifetime top-up baht).

## Read with

- `lib/features/invites/AGENTS.md`
- `app/(site)/admin/invite-codes/` — the page these routes serve
- `app/r/[code]/route.ts` — the public side of the link
- `lib/validations/inviteCode.ts`

## Rules

- No `DELETE`. Codes are switched off with `isActive`; signups point at them.
- `code` is immutable after creation — the link is already published elsewhere.
- `PATCH` validates with `partialUpdateSchema`, never `.partial()`, or an
  omitted `isActive` would silently re-enable a switched-off code.
