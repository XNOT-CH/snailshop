# Admin Invite Codes API Notes

Create and edit the marketing invite links, and read their per-code numbers
(signups, lifetime top-up baht).

## Read with

- `lib/features/invites/AGENTS.md`
- `app/(site)/admin/invite-codes/` — the page these routes serve
- `app/r/[code]/route.ts` — the public side of the link
- `lib/validations/inviteCode.ts`

## Rules

- `DELETE` is a soft delete: it stops the link (`isActive: false`) and stamps
  `deletedAt`. The row stays, because signups point at it.
- `code` is immutable after creation — the link is already published elsewhere.
- `isActive` is not part of the request schemas. Stopping a link goes through
  `DELETE`; there is no second off-switch to keep in sync.
- `PATCH` validates with `partialUpdateSchema`, never `.partial()`, or an
  omitted `destination` would arrive as its default and repoint a live link.
- `GET` never returns a stopped link. The admin table lists live links only;
  a stopped one is read back with SQL, deliberately.
