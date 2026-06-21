# Security Ownership Map - my-game-store

วันที่วิเคราะห์: 2026-06-03

## ขอบเขตและวิธีทำ

- ใช้ git history ของ repository `C:\Users\USER\my-game-store`
- Attribution ตาม author identity, ไม่รวม merge commits ตามค่า default ของสกิล
- ใช้ sensitivity rules เฉพาะ repo นี้จาก `security-ownership-map-sensitive.csv`
- Export หลักอยู่ใน `security-ownership-map-out/`: `people.csv`, `files.csv`, `edges.csv`, `cochange_edges.csv`, `summary.json`, `commits.jsonl`, `communities.json`, `cochange.graph.json`
- GraphML ไม่ได้ใช้ในผลสุดท้าย เพราะ NetworkX export ชน attribute แบบ list ระหว่างรันรอบแรก

## ตัวเลขหลัก

- พบ author identities ใน git history: 2
- ไฟล์ทั้งหมดใน map: 1,675
- ไฟล์ที่ถูก tag เป็น sensitive: 416
- เมื่อกรองเฉพาะ code/config executable: 210 sensitive files
- Sensitive code/config ที่มี bus factor = 1: 152 ไฟล์
- Sensitive code/config ที่มี bus factor = 2: 58 ไฟล์
- Orphaned sensitive code ตาม threshold stale 90 วัน: 1 ไฟล์
- Hidden-owner findings: 15 หมวด

หมายเหตุสำคัญ: author identities ทั้งสองคือ `XNOT CH <xnot.ch110249@example.com>` และ `xnotportfolio <XNOT001@xnotPortfolio>` ซึ่งมี timezone `+07:00` เหมือนกันและอาจเป็นคนเดียวกันในทางปฏิบัติ ถ้าเป็นคนเดียวกัน bus factor จริงของ sensitive code ทั้ง repo คือ 1 แม้บางไฟล์จะมี bus factor = 2 ในเชิง identity ดิบ

## Ownership Concentration

`XNOT CH <xnot.ch110249@example.com>` เป็น owner หลักของ sensitive code ในเกือบทุกหมวด:

- admin: 100%
- uploads: 100%
- season-pass: 100%
- deploy: 100%
- security: 100%
- storage: 100%
- secrets: 100%
- schema: 96%
- commerce: 78%
- topup: 68%
- gacha: 62%
- admin-api: 55%
- csrf: 56%
- auth: 53%
- permissions: 51%

นี่เป็น bus-factor risk ระดับ repo มากกว่าแค่ระดับไฟล์ เพราะหมวดที่เป็นเงิน สิทธิ์ผู้ดูแล ระบบเติมเงิน การสุ่มรางวัล และ deploy ต่างพึ่งพา owner เดียวเป็นหลัก

## High-Risk Sensitive Files

ไฟล์เหล่านี้มี bus factor = 1 และเป็น security/commerce control สำคัญ:

- `lib/features/orders/purchase.ts` - commerce purchase execution, 3 touches, owner เดียว
- `app/api/season-pass/purchase/route.ts` - season-pass purchase route, 5 touches, owner เดียว
- `lib/gachaExecution.ts` - gacha locking/reward execution, 5 touches, owner เดียว
- `lib/adminAccess.ts` - admin access routing, 2 touches, owner เดียว
- `lib/security/pin.ts` - PIN security helper, 1 touch, owner เดียว
- `lib/features/topup/topupService.ts` - top-up service layer, 1 touch, owner เดียว
- `app/api/csrf/route.ts` - stale CSRF route, 2 touches, owner เดียว และเป็น orphaned sensitive code ตาม threshold

ไฟล์ที่มี bus factor = 2 ใน identity ดิบ แต่ยังเสี่ยงถ้า identity ทั้งสองคือคนเดียวกัน:

- `auth.ts` - auth runtime, 5 touches
- `lib/csrf.ts` - CSRF helper, 6 touches
- `app/api/topup/route.ts` - top-up route, 19 touches

## Co-Change Observations

- `app/api/topup/route.ts` co-changes กับหลาย route เช่น `app/api/purchase/route.ts`, `app/api/register/route.ts`, และ admin route หลายตัว แปลว่า top-up change มักมากับ auth/admin/commerce movement
- `lib/features/orders/purchase.ts` และ `lib/gachaExecution.ts` ไม่มี co-change neighbors ที่ผ่าน threshold `min-jaccard 0.05` ในผลลัพธ์รอบนี้ จึงควรถูก treat เป็น isolated critical files: การ review ต้องเปิดไฟล์ข้างเคียงเอง ไม่ควรพึ่ง co-change graph นำทาง

## Risks

1. Single-human dependency สูงมากใน sensitive code

   แม้ git map แสดง 2 identities แต่ pattern บ่งชี้ว่าอาจเป็นคนเดียวกัน ถ้าความรู้ของ auth, admin, commerce, top-up, gacha, schema, deploy อยู่กับคนเดียว การแก้ incident หรือ review change สำคัญจะช้าและเสี่ยง miss invariant

2. Critical money flows มี owner เดียว

   Purchase, top-up, promo/commerce, gacha และ season-pass เป็น double-spend/replay/race-condition sensitive ทั้งหมด การมี owner เดียวทำให้ reviewer คนที่สองอาจไม่รู้ invariant เช่น lock, conditional update, balance handoff, reward claiming

3. Admin/API permission surface กระจุกกับ owner เดียว

   `admin`, `admin-api`, `permissions`, `auth`, และ `csrf` กระจุกหนัก โดยเฉพาะ `lib/adminAccess.ts` กับ `app/api/csrf/route.ts` ที่ bus factor = 1

4. Schema/deploy ownership กระจุกมาก

   Schema 96% และ deploy 100% อยู่กับ owner หลัก เมื่อ schema, migration, Cloudflare/OpenNext, หรือ Windows scripts มีปัญหา จะมี operational bus-factor risk สูง

5. Untracked/dirty sensitive files ยังไม่มี ownership history

   worktree ปัจจุบันมีไฟล์ sensitive ใหม่หรือแก้ไขอยู่หลายรายการ เช่น migration ใหม่, deploy helper ใหม่, top-up/gacha/admin tests และ route changes ไฟล์ที่ยังไม่ถูก commit จะไม่สะท้อนใน git-history ownership map

## Recommended Actions

1. รวม identity ก่อนใช้เป็น KPI

   สร้าง identity map ที่รวม `xnot.ch110249@example.com` และ `XNOT001@xnotPortfolio` ถ้าเป็นคนเดียวกัน แล้ว rerun ownership map เพื่อให้ bus factor จริงไม่ถูก inflate

2. ตั้ง CODEOWNERS/checklist สำหรับ sensitive paths

   อย่างน้อยควรครอบคลุม `auth.ts`, `auth.config.ts`, `middleware.ts`, `lib/auth.ts`, `lib/adminAccess.ts`, `lib/csrf.ts`, `app/api/admin/**`, `app/api/topup/**`, `app/api/cart/**`, `app/api/purchase/**`, `app/api/orders/**`, `lib/features/orders/**`, `lib/features/topup/**`, `lib/gachaExecution.ts`, `lib/features/gacha/**`, `app/api/season-pass/**`, `lib/db/schema.ts`, `drizzle/**`, `scripts/deploy/**`

3. ทำ owner handoff notes สำหรับ 7 ไฟล์ critical

   เริ่มจาก `lib/features/orders/purchase.ts`, `app/api/topup/route.ts`, `lib/gachaExecution.ts`, `lib/adminAccess.ts`, `lib/csrf.ts`, `app/api/season-pass/purchase/route.ts`, `lib/security/pin.ts`

4. ใช้ focused security review gate กับ money/admin changes

   สำหรับ PR ที่แตะ commerce/top-up/gacha/admin/auth ให้ require reviewer คนที่สองหรืออย่างน้อย checklist เรื่อง auth/CSRF, atomic update, replay, double-spend, permission boundary, audit/logging

5. Re-run map หลัง commit รอบปัจจุบัน

   เพราะ worktree มี dirty/untracked sensitive changes จำนวนมาก ผลรอบนี้สะท้อน committed history เท่านั้น ไม่ใช่ ownership ของไฟล์ใหม่ทั้งหมด

