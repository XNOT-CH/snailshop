# Dashboard Route Map

This folder contains logged-in user dashboard pages.

## Main pages

- `page.tsx`
  Dashboard landing
- `topup/page.tsx`
  Topup submission flow
- `wallet/page.tsx`
  Balance-related view
- `inventory/page.tsx`
  Purchased items / inventory
- `settings/page.tsx`
  User dashboard settings
- `season-pass/page.tsx`
  Season pass dashboard area

## Read first by task

- Topup:
  `topup/AGENTS.md`
- Dashboard shell:
  `layout.tsx`, `components/DashboardSidebar.tsx`
- Wallet or balance issue:
  `wallet/page.tsx`, `lib/userBalances.ts`, `lib/wallet.ts`

## Watchouts

- These pages are protected by `proxy.ts`.
- Many pages combine server rendering with client components and API fetches.
