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

## Common Commands

```bash
npm run dev
npm run build
npm run test
npm run db:push
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
scripts/          automation, db, ops, Windows helper scripts
docs/             runbooks, database notes, project docs
drizzle/          SQL migrations
storage/          runtime files, uploads, private assets
```

## Important Paths

- `scripts/windows/` คำสั่งช่วยงานสำหรับ Windows
- `docs/runbooks/` เอกสาร incident และ operations
- `docs/database/` แผน DB และ SQL ที่เกี่ยวข้อง
- `storage/uploads/` ไฟล์ที่อัปโหลดตอน runtime
- `storage/private/` ไฟล์ private เช่นสลิป

## Notes

- ไฟล์ runtime ใน `storage/uploads/` และ `storage/private/` ไม่ควร commit เข้า git
- ไฟล์ generated เช่น `.next/`, `coverage/`, `.scannerwork/` และ `.codex-*.log` เป็นไฟล์ local-only
