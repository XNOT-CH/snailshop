# Production Launch Checklist

เอกสารสั้นสำหรับเตรียม production config, deploy, smoke test, และ rollback ของ `my-game-store`

## Scope

- ใช้กับ production launch หรือ release ที่ต้อง deploy ผ่าน Cloudflare/OpenNext/Wrangler
- เก็บ secrets ไว้ใน environment ของ runtime/CI/Cloudflare เท่านั้น ห้าม commit ค่า secret จริงลง repo
- ไฟล์ `.env*` ถูก ignore แล้ว ยกเว้น `.env.example`
- ถ้า deploy กระทบ auth, payment, wallet, stock, topup, gacha, admin permission, DB schema, หรือ storage ให้เปิด maintenance หรือเตรียม rollback ก่อนเริ่ม

## Build And Deploy Commands

รันจาก repo root:

```bash
npm run check:deploy
npm run build
npm run cf:check
npm run cf:deploy
```

คำสั่งที่เกี่ยวข้อง:

- `npm run check:deploy` ตรวจ required env, key format, critical migration metadata, และ DB health
- `npm run build` รัน `next build`
- `npm run cf:check` รัน `opennextjs-cloudflare build && wrangler deploy --dry-run`
- `npm run cf:preview` build แล้วเปิด Cloudflare preview
- `npm run cf:deploy` build แล้ว deploy ผ่าน OpenNext Cloudflare
- `npm run cf:whoami` ตรวจบัญชี Wrangler ก่อน deploy

## Required Environment

ตั้งค่าจาก secret manager หรือ Cloudflare environment ห้าม commit ค่าเหล่านี้:

- `DATABASE_URL`
- `AUTH_SECRET`
- `ENCRYPTION_KEY`
- `CSRF_SECRET`
- `NEXT_PUBLIC_SITE_URL`
- `ALLOWED_ORIGIN`
- `CRON_SECRET`

ควรตั้งค่าเพิ่มสำหรับ production:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- `CLOUDFLARE_R2_UPLOADS_BUCKET`

หมายเหตุ:

- `ENCRYPTION_KEY` ต้องเป็น 32 bytes, 64 hex chars, หรือ base64 สำหรับ 32 bytes
- `CSRF_SECRET` ควรยาวอย่างน้อย 32 bytes
- ถ้าตั้ง `NEXT_PUBLIC_TURNSTILE_SITE_KEY` ต้องตั้ง `TURNSTILE_SECRET_KEY` คู่กัน
- ถ้าไม่มี Upstash Redis ระบบ rate limit/cache บางส่วนจะ fallback เป็น in-memory ซึ่งไม่เหมาะกับ multi-instance production
- ใช้ `ENCRYPTION_KEY_ID` และ `ENCRYPTION_PREVIOUS_KEYS` เฉพาะตอน key rotation

## Database

ก่อน deploy:

```bash
npm run db:migrate
npm run check:db-health
npm run check:deploy
```

หลัง deploy หรือหลัง incident:

```bash
npm run ops:reconcile-commerce
```

ตัวเลือกเสริม:

```bash
node scripts/ops/reconcile-commerce.mjs --hours 72
npm run check:purchase-locking
```

ข้อควรระวัง:

- `npm run db:migrate` คือ path ที่รองรับสำหรับ forward migrations
- `npm run db:push` ใช้เฉพาะ isolated dev database ตาม README
- `npm run check:purchase-locking` จะสร้าง row product ชั่วคราวเพื่อตรวจ lock handoff แล้วลบทิ้งตอนจบ
- ก่อนเปลี่ยน schema หรือ migration strategy ต้องอ่าน `drizzle/README.md` และ `drizzle/AGENTS.md`

## Storage And Uploads

Runtime upload paths:

- public uploads: `storage/uploads/**`
- private slips: `storage/private/slips/**`
- chat media: `storage/chat-media/**`
- legacy public slip path: `public/uploads/slips/**`

Production storage:

- Cloudflare binding ใน `wrangler.jsonc` คือ `UPLOADS_BUCKET`
- R2 bucket default ใน config คือ `my-game-store-uploads`
- app จะพยายามอ่าน/เขียน R2 ก่อนผ่าน `UPLOADS_BUCKET`; ถ้าไม่มี binding จะ fallback เป็น local storage
- local runtime files และ private files ไม่ควร commit

R2 migration:

```bash
npm run storage:migrate-r2 -- --bucket my-game-store-uploads
npm run storage:migrate-r2 -- --bucket my-game-store-uploads --apply
```

หรือใช้ env:

```bash
set CLOUDFLARE_R2_UPLOADS_BUCKET=my-game-store-uploads
npm run storage:migrate-r2
```

ข้อควรระวัง:

- รอบแรกให้รันแบบ dry run ก่อนเสมอ
- slip/private storage เป็นข้อมูล sensitive
- สคริปต์ `storage:migrate-slips` และ `storage:cleanup-legacy-slips` ต้องใช้ `ENCRYPTION_KEY`; ใช้เฉพาะเมื่อ task ระบุ migration/cleanup ชัดเจน

## Topup

พฤติกรรมสำคัญ:

- ระบบเติมเงินสร้างรายการ manual review/PENDING เพื่อให้แอดมินตรวจสลิปก่อนอนุมัติ
- ตรวจ topup smoke test และ admin slip review หลัง deploy
- ถ้าเกิด incident เติมเงิน ใช้ `MAINTENANCE_MODE_TOPUP=true` หรือ `MAINTENANCE_MODE=true` แล้ว redeploy ตาม `docs/runbooks/incident-commerce.md`

## Email

ตั้งค่า:

- `RESEND_API_KEY`
- `EMAIL_FROM`

พฤติกรรมสำคัญ:

- ถ้าไม่มี `RESEND_API_KEY` ฟังก์ชันส่งอีเมลจะ skip และ log warning
- ใช้ email smoke test กับ flow ที่จำเป็น เช่น verify/reset/receipt ตาม scope release
- endpoint `/api/test-email` ไม่เปิดใน production

## Cloudflare/OpenNext/Wrangler

ตรวจ config ก่อน launch:

- `wrangler.jsonc` มี `main` เป็น `.open-next/worker.js`
- assets binding คือ `ASSETS`
- R2 binding คือ `UPLOADS_BUCKET`
- Hyperdrive binding คือ `HYPERDRIVE`; ต้องเปลี่ยน id placeholder ให้เป็นค่าจริงก่อน production
- service binding `WORKER_SELF_REFERENCE` ต้องชี้ service ที่ถูกต้อง
- `compatibility_date` และ `compatibility_flags` ตรงกับ deploy target

คำสั่งตรวจ:

```bash
npm run cf:whoami
npm run check:deploy
npm run cf:check
```

## Pre-launch Checklist

- ยืนยัน branch/release tag และไม่มีไฟล์ local-only เช่น `.obsidian/workspace.json`, `.env*`, runtime storage, `.next/`, `.open-next/`, report files ถูก stage
- ยืนยัน `npm run check:deploy` ผ่าน
- ยืนยัน `npm run db:migrate` และ `npm run check:db-health` ผ่านกับ production database
- ยืนยัน `npm run cf:check` ผ่าน
- ยืนยัน Turnstile site/secret key เป็นคู่เดียวกัน
- ยืนยัน Resend sender domain พร้อมใช้งาน
- ยืนยัน R2 bucket/binding พร้อม และ migration dry run ไม่มี path แปลก
- ยืนยัน admin account, role, และ permissions ใช้งานได้
- ถ้า deploy เสี่ยงต่อ commerce ให้เตรียม maintenance env และ runbook incident-commerce

## Post-launch Smoke Test

ตรวจบน production URL:

- หน้าแรกและหน้า shop โหลดได้
- login/logout ทำงาน
- admin เข้าได้เฉพาะ role ที่มีสิทธิ์
- upload/read รูป public เช่น product/gacha/profile ใช้งานได้
- admin slip image อ่านผ่าน API ได้เมื่อมีสิทธิ์
- forgot/reset password หรือ email flow ที่เกี่ยวข้องส่งเมลได้
- topup สร้างรายการ PENDING/manual review ได้ และแอดมินอนุมัติผ่านหน้าตรวจสลิปได้
- cart/checkout/purchase 1 รายการทดสอบผ่าน และสินค้าไปที่ inventory
- gacha flow ที่เปิดใช้งาน roll ได้ตาม config
- chat image upload/read/delete ทำงานถ้า release แตะ chat
- รัน `npm run ops:reconcile-commerce` หลัง smoke test commerce

## Rollback Checklist

ถ้า deploy มีปัญหา:

1. เปิด maintenance เฉพาะ scope ที่กระทบ เช่น `MAINTENANCE_MODE_PURCHASE=true`, `MAINTENANCE_MODE_TOPUP=true`, `MAINTENANCE_MODE_GACHA=true` หรือเปิดทั้งระบบด้วย `MAINTENANCE_MODE=true`
2. Redeploy last known good Worker/build หรือ revert release commit แล้วรัน deploy path เดิม
3. ถ้า migration ถูก apply แล้ว ห้ามแก้ migration เก่าย้อนหลัง ให้ทำ forward fix หรือ restore DB backup ตามแผน ops
4. ถ้า storage/R2 migration มีปัญหา ให้หยุด `--apply`, เก็บ mapping dry-run/output, และตรวจ object keys ก่อน cleanup
5. รัน `npm run ops:reconcile-commerce` เพื่อตรวจ orders/products/topups ที่ค้างหรือผิดปกติ
6. ตรวจ logs ของ purchase, cart checkout, topup, gacha, auth, upload, email
7. ปิด maintenance หลัง smoke test สำเร็จเท่านั้น

## Known Risks And Backlog

สถานะ audit ล่าสุด:

- shared-layer audit ปิด practical closure แล้ว 2026-05-20
- deploy readiness audit, security/transaction audit, และ Playwright/UI readiness audit ถือว่าเสร็จแล้วตามสถานะล่าสุดของงาน

ความเสี่ยงที่ต้องจำไว้หลัง launch:

- งานที่เหลือจาก shared-layer audit เป็น backlog ที่ควรเปิดเป็น requirement ใหม่ ไม่ควรทำต่อแบบ open-ended
- transaction/service extraction ของ purchase/order/topup/gacha/season-pass ยังเป็นงานใหญ่ ควรทำเฉพาะเมื่อมี scope และ guard tests ชัดเจน
- response contract migration และ UI validation consolidation ยังเปลี่ยน behavior/consumer ได้ง่าย ต้อง audit client ก่อนแก้
- ถ้าไม่ตั้ง Upstash Redis ใน production, rate limit/cache บางส่วนเป็น in-memory และไม่ shared ข้าม instance
- ถ้าไม่มี R2 binding หรือ bucket ผิด, upload จะ fallback local ซึ่งไม่เหมาะกับ stateless Cloudflare production
- topup ยังเป็น manual review/PENDING จนกว่าจะเชื่อม provider ตรวจสลิปใหม่ ต้องมี admin process รองรับ
- ถ้า `RESEND_API_KEY` หรือ sender domain ไม่พร้อม, email receipt/reset/verification จะไม่ส่งจริง
- placeholder ใน `wrangler.jsonc` เช่น Hyperdrive id ต้องเปลี่ยนเป็น production value ก่อน deploy จริง
