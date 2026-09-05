# Production Launch Checklist

เอกสารสั้นสำหรับเตรียม production config, deploy, smoke test, และ rollback ของ `my-game-store`

## Scope

- ใช้กับ production launch หรือ release ที่ deploy ผ่าน Docker Compose + Cloudflare Tunnel
- เก็บ secrets ไว้ใน environment ของ runtime/CI เท่านั้น ห้าม commit ค่า secret จริงลง repo
- ไฟล์ `.env*` ถูก ignore แล้ว ยกเว้น `.env.example`
- ถ้า deploy กระทบ auth, payment, wallet, stock, topup, gacha, admin permission, DB schema, หรือ storage ให้เปิด maintenance หรือเตรียม rollback ก่อนเริ่ม

## Build And Deploy Commands

รันจาก repo root:

```bash
npm run check:deploy
npm test
docker compose up -d --build web
```

คำสั่งที่เกี่ยวข้อง:

- `npm run check:deploy` ตรวจ required env, key format, critical migration metadata, และ DB health
- `docker compose up -d --build web` build image ใหม่แล้วสลับ container `my_game_store_web`
  (Dockerfile รัน `npm run build` ข้างในเอง ไม่ต้อง build บนเครื่องก่อน)
- บน Windows ใช้ `scripts/windows/deploy-web.bat` ซึ่งเรียกคำสั่งเดียวกันจาก repo root
- `docker compose logs -f web` ดู log, `scripts/windows/status-web.bat` / `stop-web.bat` ตรวจและหยุด container

## Required Environment

ตั้งค่าจาก secret manager หรือไฟล์ env ที่ compose อ่าน (`.env.local`, `.env`) ห้าม commit ค่าเหล่านี้:

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
- `CLOUDFLARE_TUNNEL_TOKEN` สำหรับ container `cloudflared`

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

- ไฟล์อัปโหลดทั้งหมดอยู่บน disk ของ host ไม่มี object storage
- `docker-compose.yml` bind mount `./storage` และ `./public/uploads` เข้า container
  ดังนั้นไฟล์อยู่รอดข้าม rebuild แต่**ผูกกับเครื่องนั้นเครื่องเดียว**
- ถ้าย้ายเครื่องหรือเพิ่ม instance ต้องย้าย/แชร์สองโฟลเดอร์นี้เอง และต้องอยู่ในแผน backup
- local runtime files และ private files ไม่ควร commit

ข้อควรระวัง:

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

## Docker And Cloudflare Tunnel

ตรวจ config ก่อน launch:

- service `web` bind เฉพาะ `127.0.0.1:3000` — public traffic เข้าทาง tunnel เท่านั้น ไม่เปิดพอร์ตตรง
- service `cloudflared` รัน `tunnel run` ด้วย `CLOUDFLARE_TUNNEL_TOKEN` และ tunnel ต้องชี้มาที่ `web:3000`
- healthcheck ยิง `/api/health` ทุก 30s — route นี้ต้องไม่ถูก auth guard
- bind mount `./storage` และ `./public/uploads` ต้องมีอยู่จริงบน host ก่อนขึ้น container
- service `sonarqube`/`postgresql` อยู่ใต้ profile `tooling` ต้องไม่ถูกสตาร์ทบน production

คำสั่งตรวจ:

```bash
npm run check:deploy
docker compose ps
docker compose logs --tail 50 web
```

## Pre-launch Checklist

- ยืนยัน branch/release tag และไม่มีไฟล์ local-only เช่น `.env*`, runtime storage, `.next/`, report files ถูก stage
- ยืนยัน `npm run check:deploy` ผ่าน
- ยืนยัน `npm run db:migrate` และ `npm run check:db-health` ผ่านกับ production database
- ยืนยัน `npm test` และ `docker compose build web` ผ่าน
- ยืนยัน Turnstile site/secret key เป็นคู่เดียวกัน
- ยืนยัน Resend sender domain พร้อมใช้งาน
- ยืนยัน bind mount `./storage` และ `./public/uploads` ชี้ข้อมูลชุดที่ถูกต้อง และอยู่ในแผน backup
- ยืนยัน admin account, role, และ permissions ใช้งานได้
- ถ้า deploy เสี่ยงต่อ commerce ให้เตรียม maintenance env และ runbook incident-commerce

### ทำวันเปิดจริงเท่านั้น — ต้องมีโดเมนจริงก่อน

สามข้อนี้ทำล่วงหน้าไม่ได้ ไม่ใช่เพราะยังไม่ว่าง แต่เพราะมันผูกกับโดเมนและเครื่องจริงที่ยังไม่มี
บันทึกไว้ตรงนี้ (2026-09-05) เพื่อไม่ต้องจำเอง

1. **Turnstile key คู่จริง + allowed hostnames**
   dev/preview ใช้ dummy sitekey ของ Cloudflare อยู่ ต้องสร้าง widget จริงแล้วใส่โดเมน launch
   ลงใน allowed hostnames ของ widget นั้น ถ้าไม่ใส่ จะได้ error 110200 แล้ว
   **login/register/forgot-password ใช้ไม่ได้ทั้งเว็บ** ไม่ใช่แค่ปุ่มเดียว
   ตรวจด้วยว่า `E2E_AUTH_TEST_MODE` ไม่ได้ถูกตั้งใน env ของ production

2. **ใส่โดเมนจริงลง `ALLOWED_ORIGIN` / `NEXT_PUBLIC_SITE_URL` / `AUTH_URL`**
   `getTrustedOrigins` ใน `lib/csrf.ts` เชื่อเฉพาะ origin ที่อยู่ในสามตัวนี้ เวลา request
   ไม่มี CSRF token มันจะตกไปที่การตรวจ same-origin ซึ่งจะไม่ผ่านทันทีถ้าโดเมนไม่อยู่ในลิสต์
   อาการคือ admin กดบันทึกแล้วขึ้น "Invalid CSRF token" เฉพาะบนโดเมนจริง เคยเจอมาแล้วครั้งหนึ่ง
   (ฝั่งโค้ดมี `tests/api/mutation-csrf-coverage.test.ts` คุมไว้แล้วว่าทุก client ต้องใช้
   `fetchWithCsrf` เหลือแค่ค่า env นี้)

3. **ฐานข้อมูลใหม่ + rotate secret ทั้งชุด**
   migrate ขึ้นมาสะอาด seed แค่ admin กับ settings — อย่ายกข้อมูล preview มาทั้งก้อน
   rotate `AUTH_SECRET`, `ENCRYPTION_KEY`, `CSRF_SECRET` และรหัสผ่าน DB ห้ามใช้ค่าชุด preview ต่อ
   ตอน rotate `ENCRYPTION_KEY` ต้องย้ายค่าเดิมเข้า `ENCRYPTION_PREVIOUS_KEYS` ไม่ใช่ทิ้ง
   ไม่ต้องรีบทำล่วงหน้า: rotate ก่อนถึงวันเปิดมีแต่จะต้องลาก key เก่าไปเรื่อย ๆ โดยไม่ได้อะไรกลับมา

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
2. `git checkout` release commit ตัวก่อนหน้าแล้ว `docker compose up -d --build web` ใหม่
3. ถ้า migration ถูก apply แล้ว ห้ามแก้ migration เก่าย้อนหลัง ให้ทำ forward fix หรือ restore DB backup ตามแผน ops
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
- ไฟล์อัปโหลดอยู่บน disk ของ host เครื่องเดียว ตั้งแต่ 2026-09-05 มี backup รายวันของ `storage/` กับ `public/uploads/` แล้ว (ดู `docs/runbooks/mysql-backup.md`) แต่สำเนาทั้งสองชุดยังอยู่ในเครื่องเดียวกัน — ตอนขึ้น VPS ต้องมีชุดที่ส่งออกนอกเครื่อง ไม่งั้นรูปสินค้า สลิป และรูปแชททั้งหมดยังหายพร้อมเครื่องได้อยู่
- topup ยังเป็น manual review/PENDING จนกว่าจะเชื่อม provider ตรวจสลิปใหม่ ต้องมี admin process รองรับ
- ถ้า `RESEND_API_KEY` หรือ sender domain ไม่พร้อม, email receipt/reset/verification จะไม่ส่งจริง
