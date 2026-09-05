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

> ⚠️ **`db:push` ใช้ได้เฉพาะกับ dev database ที่แยกออกมาจริงๆ บนพอร์ต 3308**
> ค่า `DATABASE_URL` ที่ตั้งไว้ตอนนี้ชี้ไปที่ database ที่ container `web` ใช้จริง —
> รันใส่ตัวนั้นแล้วข้อมูลจริงเสียหาย เหตุผลเต็มอยู่ใน `CLAUDE.md`

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

## Commit และ Versioning

commit เขียนตามรูปแบบ [Conventional Commits](https://www.conventionalcommits.org/):

```text
<type>(<scope>): <subject>
```

`scope` คือส่วนของระบบ (`admin`, `gacha`, `auth`, `db`) ใส่หรือไม่ใส่ก็ได้
`subject` เขียนแบบสั่ง ตัวพิมพ์เล็ก ไม่ต้องมีจุดปิด ส่วน body ไว้อธิบาย **ว่าทำไม**
(สิ่งที่ diff บอกอยู่แล้วไม่ต้องเขียนซ้ำ)

type ที่มีผลกับเลขเวอร์ชัน:

| commit | ผลต่อเวอร์ชัน |
| --- | --- |
| `feat:` ฟีเจอร์ใหม่ | MINOR — `0.4.0` → `0.5.0` |
| `fix:` แก้บั๊ก | PATCH — `0.4.0` → `0.4.1` |
| `feat!:` หรือมี footer `BREAKING CHANGE:` | MAJOR — แต่ตอนยังอยู่ `0.x` ให้ขึ้น MINOR ตามสเปก SemVer |

type ที่เหลือไม่ขยับเลข: `docs`, `style`, `refactor`, `perf`, `test`, `build`,
`ci`, `chore`, `revert`

เลขเวอร์ชันเก็บไว้ที่ `package.json` ที่เดียว ตอนนี้อยู่ `0.x` และจะเป็น `1.0.0`
วันเปิดใช้งานจริงบน VPS ก่อน deploy prod ให้บัมป์เลข (ดูจาก type ของ commit ตั้งแต่
tag ล่าสุด: `git log v<ล่าสุด>..HEAD --oneline` — type ที่แรงสุดชนะ) แล้ว tag บน `master`:

```bash
git tag -a v0.5.0 -m "สรุปสั้น ๆ ว่าเปลี่ยนอะไร"
git push --tags
```

ข้อความใน tag ทำหน้าที่แทน changelog และ tag คือจุดที่ย้อนกลับไป build ใหม่เมื่อ deploy พัง

ดูว่า production รันเวอร์ชันไหนอยู่:

```bash
curl http://localhost:3000/api/health
# {"status":"healthy","version":"0.4.0","commit":"22a7a41","builtAt":"..."}
```

`commit` ขึ้นเป็น `dev` บน production แปลว่า build arg `GIT_COMMIT` ไม่ได้ถูกส่งเข้าไป
— deploy ผ่าน `scripts\windows\deploy-web.bat` ซึ่งอ่าน SHA ให้เอง

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
