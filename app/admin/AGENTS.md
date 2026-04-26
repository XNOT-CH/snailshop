# Admin Route Map

This folder contains admin pages.

## Admin shell

- Layout and permission gate:
  `app/admin/layout.tsx`
- Dashboard landing:
  `app/admin/page.tsx`
- Sidebar navigation:
  `components/admin/AdminSidebar.tsx`
- Permission provider for client components:
  `components/admin/AdminPermissionsProvider.tsx`

## Feature map

- Products:
  `products/page.tsx`, `products/new/page.tsx`, `products/[id]/edit/page.tsx`, `products/[id]/stock/page.tsx`
- Users and roles:
  `users/page.tsx`, `roles/page.tsx`
- Slips/topup review:
  `slips/page.tsx`
- Settings/content:
  `settings/page.tsx`, `news/page.tsx`, `popups/page.tsx`, `help/page.tsx`, `nav-items/page.tsx`, `footer-links/page.tsx`
- Gacha:
  `gacha-machines/page.tsx`, `gacha-machines/[id]/edit/page.tsx`, `gacha-grid/page.tsx`, `gacha-settings/page.tsx`
- Other operations:
  `chat/page.tsx`, `audit-logs/page.tsx`, `currency-settings/page.tsx`, `export/page.tsx`, `season-pass/page.tsx`

## Read first by task

- Add/remove admin menu:
  `components/admin/AdminSidebar.tsx`, `lib/adminAccess.ts`, `lib/permissions.ts`
- Admin access bug:
  `app/admin/layout.tsx`, `lib/auth.ts`, `lib/adminAccess.ts`, `proxy.ts`
- Slip approval:
  `slips/page.tsx`, `components/admin/SlipTable.tsx`, `app/api/admin/slips/route.ts`
- Product admin:
  `products/page.tsx`, `components/admin/ProductTable.tsx`, `app/api/admin/products/*`
- User admin:
  `users/page.tsx`, `users/AdminUsersClient.tsx`, `app/api/admin/users/[id]/route.ts`
- News/settings:
  `news/page.tsx`, `settings/page.tsx`, `app/api/admin/news/route.ts`, `app/api/admin/settings/route.ts`
- Gacha admin:
  `gacha-machines/page.tsx`, `app/api/admin/gacha-machines/route.ts`, `app/api/admin/gacha-rewards/route.ts`

## Watchouts

- Menu visibility is not enough; real access comes from `lib/adminAccess.ts` and `lib/auth.ts`.
- Many admin pages mix server rendering with client tables/forms.
- For matching API handlers, read `app/api/AGENTS.md` next.
