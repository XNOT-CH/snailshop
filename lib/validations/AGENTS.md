# Validation Notes

This folder contains Zod schemas and validation helpers.

## Main files by domain

- `auth.ts`
  Login and auth input
- `product.ts`
  Product forms and payloads
- `topup.ts`
  Topup and slip review input
- `user.ts`
  User admin payloads
- `profile.ts`
  Profile settings input
- `settings.ts`
  Site settings payloads
- `content.ts`
  News/help/content payloads
- `gacha.ts`
  Gacha machine/reward payloads
- `pin.ts`
  PIN input
- `validate.ts`
  Generic helper used by route handlers

## Read with

- Matching route/page for the feature you are changing
- `lib/db/schema.ts`
- `lib/auth.ts`

## Watchouts

- Route handlers may use either `validateBody` or other helper wrappers.
- Validation errors often define the user-facing API message shape.
