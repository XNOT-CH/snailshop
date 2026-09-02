# App Route Map

This folder is the main route tree for the app.

## Structure

- `app/<route>/page.tsx`
  Page entry point
- `app/<route>/layout.tsx`
  Layout wrapper
- `app/api/**/route.ts`
  Route handlers
- `app/(site)/admin/*`
  Admin console pages
- `app/(site)/dashboard/*`
  Logged-in user dashboard pages

## Read first by task

- Login/auth:
  `app/(site)/login/page.tsx`, `app/api/auth/[...nextauth]/route.ts`
- Admin shell/navigation:
  `app/(site)/admin/layout.tsx`, `app/(site)/admin/page.tsx`
- Topup:
  `app/(site)/dashboard/topup/page.tsx`, `app/api/topup/route.ts`, `app/(site)/admin/slips/page.tsx`
- Products:
  `app/(site)/admin/products/page.tsx`, `app/(site)/product/[id]/page.tsx`
- Users:
  `app/(site)/admin/users/page.tsx`, `app/(site)/profile/settings/page.tsx`
- Content/settings:
  `app/(site)/admin/settings/page.tsx`, `app/(site)/admin/news/page.tsx`, `app/api/admin/settings/route.ts`
- Gacha:
  `app/(site)/admin/gacha-machines/page.tsx`, `app/(site)/gacha/page.tsx`, `app/(site)/gacha-grid/[machineId]/page.tsx`

## High-signal entry files

- Root layout:
  `app/layout.tsx`
- Admin layout:
  `app/(site)/admin/layout.tsx`
- Dashboard layout:
  `app/(site)/dashboard/layout.tsx`

## Watchouts

- Some page files contain direct DB/business logic, not just rendering.
- A route may still be blocked earlier by `proxy.ts`.
- For admin pages, read `app/(site)/admin/AGENTS.md` next.
