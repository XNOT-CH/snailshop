# Admin Component Notes

This folder contains most admin-side interactive UI.

## High-signal components

- `AdminSidebar.tsx`
  Admin navigation shell
- `AdminPermissionsProvider.tsx`
  Client permission context
- `ProductTable.tsx`
  Product list interactions
- `SlipTable.tsx`
  Pending slip review actions
- `TopupTable.tsx`
  Topup summaries/tables
- `AdminChatInbox.tsx`
  Admin chat UI

## Read first by task

- Product admin UI:
  `ProductTable.tsx`, `ProductImageGalleryField.tsx`
- Slip approval UI:
  `SlipTable.tsx`, `TopupTable.tsx`
- Admin shell/navigation:
  `AdminSidebar.tsx`, `AdminPermissionsProvider.tsx`
- Dashboard widgets:
  `RevenueChart.tsx`, `SalesDistribution.tsx`, `RecentTransactions.tsx`

## Watchouts

- Many components call APIs directly with `fetch`.
- Permission-aware behavior often depends on `useAdminPermissions()`.
- Pair each component with its page and API handler before editing.
