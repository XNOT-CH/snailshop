# Admin Users Notes

This folder is the admin surface for user management.

## Files

- `page.tsx`
  Server entry, loads users and serializes values
- `AdminUsersClient.tsx`
  Client table/actions for user management

## Read with

- `app/api/admin/users/[id]/route.ts`
- `app/admin/roles/page.tsx`
- `lib/permissions.ts`
- `lib/auth.ts`
- `lib/validations/user.ts`
- `lib/security/pin.ts`
- `lib/db/schema.ts`

## Watchouts

- Numeric DB fields are converted to strings before being passed to the client.
- Role and permission behavior is shared with admin access elsewhere.
- PIN fields on users affect other sensitive flows too.
