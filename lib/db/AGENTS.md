# DB Notes

This folder is the data-model anchor for the app.

## Files

- `schema.ts`
  Main table definitions and relations
- `index.ts`
  Drizzle DB setup
- `singletons.ts`
  IDs/constants for singleton-like records

## Use this folder when

- You need to know what a field really is
- You need to confirm relations
- You need to trace decimal/string/date behavior
- You need to find the source table for a feature

## Most common tables

- `users`
- `roles`
- `products`
- `orders`
- `topups`
- `siteSettings`
- `newsArticles`
- `gachaMachines`
- `gachaRewards`

## Watchouts

- Decimal values often need conversion before UI use.
- Datetime values are commonly handled as strings.
- A lot of feature debugging starts here even if the bug looks “UI-only”.
