# Component Map

This folder contains reusable UI and feature-specific client components.

## Main groups

- `components/admin/*`
  Admin tables, forms, dashboard panels, and control surfaces
- `components/ui/*`
  Reusable design system primitives
- `components/cart/*`
  Cart UI
- `components/chat/*`
  Chat presentation
- `components/profile/*`
  Profile and PIN settings
- `components/season-pass/*`
  Season pass UI

## Read first by task

- Admin navigation or shell:
  `components/admin/AdminSidebar.tsx`, `components/admin/AdminPermissionsProvider.tsx`
- Product admin table:
  `components/admin/ProductTable.tsx`, `components/admin/ProductImageGalleryField.tsx`
- Slip approval UI:
  `components/admin/SlipTable.tsx`, `components/admin/TopupTable.tsx`
- Public storefront:
  `components/Navbar.tsx`, `components/Footer.tsx`, `components/HeroBanner.tsx`, `components/ProductCard.tsx`
- Dashboard:
  `components/DashboardSidebar.tsx`, `components/DashboardTabs.tsx`
- Gacha:
  `components/GachaHubClient.tsx`, `components/GachaGridMachine.tsx`, `components/GachaRhombus.tsx`, `components/GachaResultModal.tsx`

## Watchouts

- Many admin pages delegate most client behavior into `components/admin/*`.
- Shared components may be used by both public and dashboard routes.
- For route ownership and API pairings, read the nearest `app/AGENTS.md`.
