# ManaShop - AI Assistant Instructions

## ⚠️ REQUIRED: Read Project Context First

Before starting **any** task, you MUST read and internalize the full project context:

📖 **[`PROJECT_CONTEXT.md`](../PROJECT_CONTEXT.md)** — อยู่ที่ root ของโปรเจกต์

ไฟล์นี้มี:
- Tech Stack และ versions ที่ใช้
- Database Schema (ทุก model และ field สำคัญ)
- API Auth Pattern ที่ต้องใช้
- Gacha System architecture
- Naming Conventions
- Known Caveats และ gotchas
- Recent Development history

## Key Reminders

- ภาษาไทยสำหรับ UI text, ภาษาอังกฤษสำหรับ code
- Auth check ใช้ `lib/auth.ts` เท่านั้น — ไม่ใช่ Role table
- Mutation API ทุกตัวต้องมี CSRF token (`isAdminWithCsrf` / `isAuthenticatedWithCsrf`)
- Drizzle ORM schema อยู่ที่ `lib/db/schema.ts` — ดูที่นี่ก่อนสร้าง query ใหม่
