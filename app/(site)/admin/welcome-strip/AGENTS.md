# Welcome Strip Admin Notes

This page manages the image strip shown on `/welcome`.

## Read with

- `app/(immersive)/welcome/page.tsx`
- `lib/welcomeStrip.ts`
- `app/api/admin/settings/route.ts`
- `lib/validations/settings.ts`

## Watchouts

- The admin edits 12 source images; the welcome page duplicates them into 24 visible slots for seamless marquee motion.
- Keep uploads and saves behind existing settings permissions.
