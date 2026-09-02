# My Game Store

ร้านขายไอดีเกมและสินค้าดิจิทัลสำหรับตลาดไทย พัฒนาด้วย Next.js 16, TypeScript, Drizzle ORM และ MySQL

## Getting Started

เริ่มฐานข้อมูล dev แบบแยก:

```bash
docker compose up -d app_db_dev
```

หรือบน Windows ใช้:

```bash
scripts\windows\start-dev-db.bat
```

sync schema เข้า dev database:

> ⚠️ **อย่ารัน `db:push` กับ database ปกติของโปรเจกต์**
> `DATABASE_URL` ใน `.env.development.local` และ `.env.local` ชี้ไปที่ตัวเดียวกัน (`localhost:3307`)
> ซึ่งเป็น database ที่ container `web` ใช้จริง และตัวมันเองก็ตกหลัง `lib/db/schema.ts` อยู่แล้ว
> `db:push` จึงจะ apply diff ทั้งกองลงของจริง ให้เพิ่มตาราง/คอลัมน์/index ใหม่ด้วย SQL เจาะจงแทน
> (ดูตัวอย่างใน `drizzle/`) คำสั่งด้านล่างใช้ได้เฉพาะกับ dev database ที่แยกออกมาจริงๆ บนพอร์ต 3308

```bash
set APP_ENV=development && npm run db:push
```

หรือบน Windows ใช้:

```bash
scripts\windows\db-push-dev.bat
```

รัน dev server:

```bash
npm run dev
```

หรือบน Windows ใช้:

```bash
scripts\windows\dev-web.bat
```

หน้าเว็บ local อยู่ที่ [http://localhost:3001](http://localhost:3001)

Playwright E2E:

```bash
npm run dev
npm run test:e2e
```

ถ้ารันเว็บบนพอร์ตอื่น ให้กำหนด `PLAYWRIGHT_BASE_URL` ก่อนรัน เช่น `http://127.0.0.1:3002`

## Common Commands

```bash
npm run dev
npm run build
npm run test
npm run test:e2e
npm run db:studio
docker compose up -d --build web
```

Windows helper scripts ถูกย้ายไปไว้ใน `scripts/windows/`

## Repository Layout

```text
app/              Next.js app router และ API routes
components/       UI และ feature components
lib/              db, auth, business logic, utilities
hooks/            React hooks
tests/            unit/integration tests
public/           static assets
scripts/          dev, deploy, db, exports, ops, product sync, quality, seeds, storage, Windows helpers
docs/             runbooks, database notes, project docs
drizzle/          SQL migrations
storage/          runtime files, uploads, private assets
proxy.ts          middleware (Next 16 renamed middleware.ts -> proxy.ts)
```

## Important Paths

- `scripts/windows/` คำสั่งช่วยงานสำหรับ Windows
- `scripts/dev/` dev server helpers
- `scripts/deploy/` deployment validation scripts
- `scripts/db/` database health and database utility scripts
- `scripts/exports/` export helper scripts
- `scripts/ops/` operational verification and reconciliation scripts
- `scripts/products/` product export/import sync scripts
- `scripts/seeds/` local or controlled-environment seed scripts
- `scripts/storage/` storage migration and cleanup scripts
- `scripts/quality/` repository quality checks
- `docs/runbooks/` เอกสาร incident และ operations
- `docs/database/` แผน DB และ SQL ที่เกี่ยวข้อง
- `storage/uploads/` ไฟล์ที่อัปโหลดตอน runtime
- `storage/private/` ไฟล์ private เช่นสลิป

## Notes

- ไฟล์ runtime ใน `storage/uploads/` และ `storage/private/` ไม่ควร commit เข้า git
- ไฟล์ generated เช่น `.next/`, `coverage/`, `.scannerwork/` และ `.codex-*.log` เป็นไฟล์ local-only
