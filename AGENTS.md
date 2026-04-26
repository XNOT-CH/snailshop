# Project Agent Notes

## Encoding

- This repository contains Thai text. Treat UTF-8 as the default encoding for all text files.
- When using PowerShell commands that read or write text file contents, always specify `-Encoding utf8`.
- Do not rely on PowerShell's default encoding when working with repository files.
- If you need to create, rewrite, append, or export text in PowerShell, include `-Encoding utf8` explicitly every time.

## PowerShell Examples

- Read file: `Get-Content -Encoding utf8 <path>`
- Write file: `Set-Content -Encoding utf8 <path> <value>`
- Append file: `Add-Content -Encoding utf8 <path> <value>`
- Export file: `Out-File -Encoding utf8 <path>`

## Goal

- Prevent corrupted Thai characters and encoding drift during agent edits, inspection, and automation.

## AI Navigation Map

Use this file as the repo-level starting point, then read the nearest nested `AGENTS.md`.

### Read first by task

- Login/auth/session:
  `app/AGENTS.md`, `app/api/AGENTS.md`, `lib/AGENTS.md`, `auth.ts`, `auth.config.ts`, `proxy.ts`
- Admin page or permission issue:
  `app/admin/AGENTS.md`, `app/api/AGENTS.md`, `lib/AGENTS.md`
- Product CRUD or stock:
  `app/admin/AGENTS.md`, `app/api/AGENTS.md`, `lib/AGENTS.md`, `components/AGENTS.md`
- Topup/slip review:
  `app/AGENTS.md`, `app/admin/AGENTS.md`, `app/api/AGENTS.md`, `lib/AGENTS.md`
- Content/settings/news/navigation:
  `app/admin/AGENTS.md`, `app/api/AGENTS.md`, `lib/AGENTS.md`
- Gacha:
  `app/admin/AGENTS.md`, `app/api/AGENTS.md`, `lib/AGENTS.md`, `components/AGENTS.md`

### Main ownership map

- `app/`
  Routes, pages, layouts, and route handlers
- `components/`
  UI building blocks and feature-specific client components
- `lib/`
  Auth, permissions, DB schema, validation, business logic, security helpers
- `auth.ts`
  NextAuth runtime and credentials authorize flow
- `auth.config.ts`
  Edge/session callbacks and protected route auth behavior
- `proxy.ts`
  Route guarding before page/API code runs

### Important rule

If a task touches admin access, always check both:

- UI visibility: `components/admin/AdminSidebar.tsx`
- real access control: `lib/adminAccess.ts`, `lib/permissions.ts`, `lib/auth.ts`, `proxy.ts`
