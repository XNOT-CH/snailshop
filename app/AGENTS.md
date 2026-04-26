# App Route Map

This folder is the main route tree for the app.

## Structure

- `app/<route>/page.tsx`
  Page entry point
- `app/<route>/layout.tsx`
  Layout wrapper
- `app/api/**/route.ts`
  Route handlers
- `app/admin/*`
  Admin console pages
- `app/dashboard/*`
  Logged-in user dashboard pages

## Read first by task

- Login/auth:
  `app/login/page.tsx`, `app/api/login/route.ts`, `app/api/auth/[...nextauth]/route.ts`
- Admin shell/navigation:
  `app/admin/layout.tsx`, `app/admin/page.tsx`
- Topup:
  `app/dashboard/topup/page.tsx`, `app/api/topup/route.ts`, `app/admin/slips/page.tsx`
- Products:
  `app/admin/products/page.tsx`, `app/product/[id]/page.tsx`
- Users:
  `app/admin/users/page.tsx`, `app/profile/settings/page.tsx`
- Content/settings:
  `app/admin/settings/page.tsx`, `app/admin/news/page.tsx`, `app/api/admin/settings/route.ts`
- Gacha:
  `app/admin/gacha-machines/page.tsx`, `app/gacha/page.tsx`, `app/gacha-grid/[machineId]/page.tsx`

## High-signal entry files

- Root layout:
  `app/layout.tsx`
- Admin layout:
  `app/admin/layout.tsx`
- Dashboard layout:
  `app/dashboard/layout.tsx`

## Watchouts

- Some page files contain direct DB/business logic, not just rendering.
- A route may still be blocked earlier by `proxy.ts`.
- For admin pages, read `app/admin/AGENTS.md` next.
