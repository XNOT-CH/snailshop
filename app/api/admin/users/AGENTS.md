# Admin User API Notes

This folder contains admin user mutation APIs.

## Files

- `[id]/route.ts`
  Update user fields, role, balances, or other admin-managed user data

## Read with

- `app/admin/users/page.tsx`
- `app/admin/users/AdminUsersClient.tsx`
- `lib/validations/user.ts`
- `lib/permissions.ts`
- `lib/db/schema.ts`

## Watchouts

- User mutations can affect permissions, balances, and security-related fields.
- Permission logic should be verified end-to-end after changing role behavior.
