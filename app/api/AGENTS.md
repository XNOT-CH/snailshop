# API Route Map

This folder contains public and admin route handlers.

## Main groups

- Auth/session:
  `auth/[...nextauth]/route.ts`, `login/route.ts`, `logout/route.ts`, `session/route.ts`, `csrf/route.ts`
- Admin APIs:
  `admin/**/route.ts`
- Commerce:
  `products/*`, `orders/*`, `purchase/route.ts`, `cart/checkout/route.ts`
- User/account:
  `profile/*`, `user/*`, `register/route.ts`
- Content:
  `news/route.ts`, `popups/route.ts`, `nav-items/route.ts`, `footer-widget/route.ts`
- Topup:
  `topup/route.ts`, `admin/slips/route.ts`, `admin/easyslip-info/route.ts`
- Gacha:
  `gacha/*`, `admin/gacha-*/*`

## Read first by task

- Login/auth:
  `auth/[...nextauth]/route.ts`, `login/route.ts`, `csrf/route.ts`, `session/route.ts`
- Admin permission problem:
  `lib/adminAccess.ts`, `lib/auth.ts`, `proxy.ts`
- Product mutation:
  `products/[id]/route.ts`, `admin/products/[id]/featured/route.ts`, `admin/products/[id]/duplicate/route.ts`
- Topup:
  `topup/route.ts`, `admin/slips/route.ts`, `admin/easyslip-info/route.ts`
- Site settings/content:
  `admin/settings/route.ts`, `admin/news/route.ts`, `admin/nav-items/route.ts`, `admin/footer-links/route.ts`
- Gacha:
  `admin/gacha-machines/route.ts`, `admin/gacha-rewards/route.ts`, `gacha/roll/route.ts`, `gacha/grid/roll/route.ts`

## Auth patterns

- Admin page/API permission checks usually rely on:
  `lib/auth.ts`
- Admin route-to-permission mapping:
  `lib/adminAccess.ts`
- CSRF helpers:
  `lib/csrf.ts`, `lib/csrf-client.ts`

## Watchouts

- Some admin routes require `requirePermission`, others `requireAnyPermission`.
- Topup and security-sensitive routes may require both auth and PIN/CSRF validation.
- External services involved:
  EasySlip, upload endpoints, email, optional Redis-backed services
