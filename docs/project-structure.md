# Project Structure Guide

เอกสารนี้กำหนดแนวทางจัดโครงสร้าง repository ให้ดูแลง่าย เป็นระบบ และลดความสับสนเวลาเพิ่มไฟล์ใหม่หรือย้าย logic ในอนาคต

## เป้าหมาย

1. ทำให้ root ของโปรเจกต์อ่านแล้วเข้าใจทันทีว่า folder ไหนมีหน้าที่อะไร
2. แยก source code, tests, docs, scripts, config, generated output และ local runtime data ให้ชัดเจน
3. ลดการเพิ่มไฟล์ใหม่ผิดที่จน `lib/`, `docs/`, หรือ `scripts/` บวมเกินไป
4. ทำให้การ refactor ในอนาคตปลอดภัยขึ้น เพราะมี destination ที่ตกลงร่วมกันแล้ว

## Root Folder Map

### Application Source

- `app/`
  Next.js App Router pages, layouts, route handlers, loading/error states และ API routes

- `components/`
  Reusable UI components, feature components, providers และ component-level client logic

- `hooks/`
  React hooks ที่ใช้ซ้ำข้าม component หรือ feature

- `lib/`
  Business logic, database access, security helpers, validations, feature services และ utilities

- `types/`
  Shared TypeScript types ที่ใช้ได้หลายส่วนของระบบ

- `public/`
  Static public assets ที่ browser เข้าถึงได้โดยตรง

### Quality and Operations

- `tests/`
  Unit tests, API tests, component tests และ future e2e tests

- `docs/`
  Project documentation, planning docs, database notes และ operational runbooks

- `scripts/`
  Dev, deployment, database, validation และ operations scripts

- `drizzle/`
  Database migrations และ Drizzle metadata

### Tooling and Config

- `.agents/`
  Agent skills, local agent instructions และ automation helpers

- `.github/`
  GitHub workflows, issue/PR templates และ repository automation

- `.vscode/`
  Shared workspace/editor configuration

- `.vercel/`
  Vercel local project metadata

- Root config files
  เช่น `package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `docker-compose.yml`, `Dockerfile`, `.env.example`

### Local or Generated Data

- `.next/`
  Next.js generated build output ห้ามแก้ด้วยมือและไม่ควร commit

- `node_modules/`
  Installed dependencies ห้ามแก้ด้วยมือและไม่ควร commit

- `docker-data/`
  Local Docker volume data ควรถือเป็น local runtime data

- `storage/`
  Runtime upload/private files ควรแยกให้ชัดว่าไฟล์ไหนเป็น local data และไฟล์ไหนเป็น tracked documentation/config

- `backups/`
  Local backup/import-export artifacts ควร commit เฉพาะไฟล์ตัวอย่างหรือเอกสารที่ตั้งใจเก็บจริง

## Recommended Internal Structure

### `docs/`

โครงสร้างเป้าหมาย:

```text
docs/
  planning/
    project-requirements.md
    project-roadmap.md
    shop-testing-plan.md
  runbooks/
    login-auth.md
    shop-testing.md
  database/
  sql/
  project-context.md
  project-structure.md
```

แนวทาง:

- เอกสารแผนงานหรือ roadmap ให้อยู่ใน `docs/planning/`
- เอกสารที่ใช้ทำงานซ้ำหรือใช้ตอน incident ให้อยู่ใน `docs/runbooks/`
- เอกสาร database ให้อยู่ใน `docs/database/` หรือ `docs/sql/`

### `scripts/`

โครงสร้างเป้าหมาย:

```text
scripts/
  admin/
  dev/
  db/
  deploy/
  exports/
  ops/
  products/
  quality/
  seeds/
  storage/
  windows/
  sonar/
```

แนวทาง:

- Script ตรวจ database หรือ migration ให้อยู่ใน `scripts/db/`
- Script สำหรับ admin maintenance ให้อยู่ใน `scripts/admin/`
- Script ตรวจ deploy readiness ให้อยู่ใน `scripts/deploy/`
- Script สำหรับ export helper ให้อยู่ใน `scripts/exports/`
- Script สำหรับ operational verification เช่น purchase locking ให้อยู่ใน `scripts/ops/`
- Script สำหรับ product export/import ให้อยู่ใน `scripts/products/`
- Script สำหรับ storage migration/cleanup ให้อยู่ใน `scripts/storage/`
- Script สำหรับ quality checks ให้อยู่ใน `scripts/quality/`
- Script สำหรับ dev helper ให้อยู่ใน `scripts/dev/`
- Script สำหรับ seed data ให้อยู่ใน `scripts/seeds/`
- หลังย้าย script ต้องปรับ path ใน `package.json` เสมอ

### `lib/`

โครงสร้างเป้าหมาย:

```text
lib/
  db/
  features/
    content/
    gacha/
    orders/
    products/
    promo/
    season-pass/
  security/
  validations/
  utils/
```

แนวทาง:

- Business logic ราย feature ให้อยู่ใน `lib/features/<domain>/`
- Code ที่เกี่ยวกับ auth, PIN, CSRF, rate limit หรือ sensitive data ให้อยู่ใน `lib/security/` หรือ helper ที่ชื่อชัดเจน
- Low-level helpers ที่ไม่ผูกกับ business domain ให้อยู่ใน `lib/utils/`
- Validation schema ให้อยู่ใน `lib/validations/`
- หลีกเลี่ยงการเพิ่มไฟล์ใหม่ที่ root ของ `lib/` ยกเว้นเป็น entrypoint ที่ใช้กว้างจริง ๆ

### `tests/`

โครงสร้างเป้าหมาย:

```text
tests/
  api/
    shop/
    admin/
    auth/
    season-pass/
  components/
  lib/
  e2e/
```

แนวทาง:

- Tests ควรสะท้อน source/domain ที่ทดสอบ
- Business-critical tests เช่น purchase, checkout, promo, stock ควรถูกจัดเป็นกลุ่มอ่านง่าย
- ก่อนย้าย test จำนวนมาก ให้รัน test ชุดเดิมและจด baseline ก่อน

## Placement Rules

ใช้กฎนี้เมื่อเพิ่มไฟล์ใหม่:

1. ถ้าเป็น page, layout หรือ route handler ให้อยู่ใน `app/`
2. ถ้าเป็น UI component ให้อยู่ใน `components/`
3. ถ้าเป็น business rule หรือ transaction ให้อยู่ใน `lib/features/<domain>/`
4. ถ้าเป็น validation schema ให้อยู่ใน `lib/validations/`
5. ถ้าเป็น security helper ให้อยู่ใน `lib/security/`
6. ถ้าเป็น script ที่เรียกจาก CLI ให้อยู่ใน `scripts/<category>/`
7. ถ้าเป็นเอกสารวิธีปฏิบัติซ้ำ ให้อยู่ใน `docs/runbooks/`
8. ถ้าเป็นแผนหรือ requirement ให้อยู่ใน `docs/planning/`
9. ถ้าเป็น generated output หรือ local runtime data ให้ตรวจ `.gitignore` ก่อน commit

## Naming Guidelines

- ใช้ชื่อ folder แบบ lowercase และใช้ hyphen เมื่อมีหลายคำ เช่น `season-pass`
- ใช้ชื่อไฟล์ให้บอก intent เช่น `purchase.ts`, `queries.ts`, `mutations.ts`, `validation.ts`
- Route handlers ใช้ convention ของ Next.js เช่น `route.ts`, `page.tsx`, `layout.tsx`
- Test files ใช้ suffix `.test.ts` หรือ `.test.tsx`
- Script files ใช้ชื่อ action-first เช่น `validate-db-health.mjs`, `verify-purchase-locking.mjs`

## Refactor Order

แนะนำให้จัดทีละ step เพื่อลดความเสี่ยง:

1. เพิ่มเอกสารโครงสร้างโปรเจกต์
2. ย้าย docs เข้า `docs/planning/` และ `docs/runbooks/`
3. ตรวจ `.gitignore` สำหรับ generated/local folders
4. ย้าย scripts ตาม category และปรับ `package.json`
5. ย้ายไฟล์ใน `lib/` ทีละ domain
6. ย้าย tests ให้สะท้อน domain หลัง source structure นิ่งแล้ว

## Safety Checklist Before Moving Files

1. อ่าน `AGENTS.md` ที่เกี่ยวข้องก่อนย้าย
2. ใช้ `git status --short` เพื่อดู working tree
3. ย้ายทีละกลุ่มเล็ก ๆ
4. ปรับ imports และ script paths ทันที
5. รัน test หรือ build ที่เกี่ยวข้อง
6. ตรวจว่าไม่มี generated/local data ถูก stage โดยไม่ตั้งใจ

## Definition of Done

การจัดโครงสร้างรอบหนึ่งถือว่าเสร็จเมื่อ:

1. Folder ที่ย้ายมี destination ชัดเจนตามเอกสารนี้
2. Import paths และ `package.json` scripts ยังถูกต้อง
3. `npm run build` ผ่านเมื่อมีการย้าย source code
4. Tests ที่เกี่ยวข้องผ่าน
5. `git status --short` ไม่มีไฟล์ค้างที่ไม่ตั้งใจ
