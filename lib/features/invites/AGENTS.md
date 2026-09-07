# Invite Link Feature Notes

Marketing attribution for hired promoters: one `InviteCode` row per channel,
`/r/<code>` sets a cookie and counts the click, `/api/register` stamps
`User.inviteCodeId` once, and every later top-up by that account counts towards
the channel.

## Read with

- `app/r/[code]/route.ts` — the public link handler
- `app/api/admin/invite-codes/AGENTS.md`
- `app/(site)/admin/invite-codes/` — the admin table
- `lib/validations/inviteCode.ts`

## Rules

- `attribution.ts` must never throw. Registration outranks analytics.
- `inviteClicks.ts` writes Redis keys through the raw client, which is **not**
  namespaced by environment — keep the `dev:`/`prod:` prefix.
- Stats are counted with one query per metric and merged in JS. A single join
  across users, top-ups and clicks multiplies the numbers.
- Codes are switched off, never deleted: `User.inviteCodeId` is ON DELETE
  RESTRICT and that column is the only record of where a signup came from.
