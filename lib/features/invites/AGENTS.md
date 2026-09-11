# Invite Link Feature Notes

Marketing attribution for hired promoters: one `InviteCode` row per channel,
`/r/<code>` sets a cookie, `/api/register` stamps
`User.inviteCodeId` once, and every later top-up by that account counts towards
the channel.

## Read with

- `app/r/[code]/route.ts` — the public link handler
- `app/api/admin/invite-codes/AGENTS.md`
- `app/(site)/admin/invite-codes/` — the admin table
- `lib/validations/inviteCode.ts`

## Rules

- `attribution.ts` must never throw. Registration outranks analytics.
- Stats are counted with one query per metric and merged in JS. A single join
  across users and top-ups multiplies the numbers.
- Nothing here hard-deletes a code. "ลบ" in the admin table sets `deletedAt`
  and `isActive: false`, which kills the link and files the row under "ปิดแล้ว"
  rather than removing it; `User.inviteCodeId` is ON DELETE RESTRICT and is the
  only record of where a signup came from.
- `isActive` is internal now — only `softDeleteInviteCode` writes it, and
  `/r/<code>` reads it. There is no admin switch for it.
- `findInviteCodeByCode` deliberately still sees deleted rows — it is the
  duplicate guard, and a retired code must not be handed to a new campaign.
