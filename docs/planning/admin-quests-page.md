# แผนหน้า /admin/quests (จัดการภารกิจรายวัน)

เอกสารนี้เป็นแผนก่อนลงมือเขียนโค้ด สำหรับหน้าแอดมินจัดการภารกิจรายวัน
(`DailyQuest`) ซึ่งตอนนี้ยังไม่มีหน้าแอดมินรองรับ

## 1. สถานะปัจจุบัน (จากโค้ดจริง)

มีอยู่แล้ว:

- ตาราง `DailyQuest` และ `DailyQuestClaim` ใน `lib/db/schema.ts:764-800`
  - `DailyQuest`: `slug` (unique), `title`, `description`, `goalType`,
    `goalValue`, `rewardPoints`, `ctaHref`, `sortOrder`, `isActive`
  - `DailyQuestClaim`: unique `(userId, questId, dateKey)` เป็นตัวกันรับซ้ำ
    และเก็บ `rewardPoints` เป็น snapshot ณ เวลาที่กดรับ
- Business logic ฝั่งผู้ใช้ `lib/features/quests/dailyQuests.ts`
  - `QUEST_GOAL_TYPES` = `CHECK_IN`, `PURCHASE_COUNT`, `TOPUP_AMOUNT`,
    `GACHA_SPINS`, `SEASON_PASS_CLAIM`
  - `getActiveQuests()`, `getDailyQuestBoard()`, `claimDailyQuest()`
  - วันรีเซ็ตอิงเวลาไทยผ่าน `getThaiDayStartUtc()` / `formatDateInTimeZone()`
- หน้าผู้ใช้ `app/(site)/quests/page.tsx` และ API `app/api/quests/claim/route.ts`
- เมนูฝั่งผู้ใช้ `lib/navigation.ts` (`/quests`)

ยังไม่มี:

- หน้าแอดมิน `app/(site)/admin/quests/`
- API แอดมิน `app/api/admin/quests/`
- permission สำหรับภารกิจใน `lib/permissions.ts`
- rule ใน `lib/adminAccess.ts` และเมนูใน `components/admin/AdminSidebar.tsx`
- audit action สำหรับภารกิจใน `lib/auditLog.ts`
- migration SQL: ตาราง `DailyQuest*` มีเฉพาะใน `lib/db/schema.ts`
  ไม่มีไฟล์ใน `drizzle/` ทั้งที่ `drizzle/README.md` ระบุว่า `npm run db:migrate`
  คือทางที่รองรับ (แปลว่าตารางถูกสร้างด้วย `db:push` เท่านั้น) ต้องเช็คก่อน deploy

## 2. หน้า /admin/quests ควรมีอะไรบ้าง

### 2.1 ส่วนหัว

- ชื่อหน้า "ภารกิจรายวัน" + คำอธิบายสั้น
- ปุ่ม "เพิ่มภารกิจ" (เห็นเฉพาะคนที่มีสิทธิ์แก้ไข)
- ปุ่มลิงก์ "ดูหน้าผู้ใช้" ไป `/quests`
- ปุ่มลิงก์ "ประวัติการรับรางวัล" ไป `/admin/quests/logs`

### 2.2 การ์ด KPI (4 ใบ ตามแพตเทิร์นหน้า Season Pass)

- ภารกิจที่เปิดใช้งาน / ทั้งหมด
- จำนวนการรับรางวัลวันนี้ (นับ `DailyQuestClaim` ที่ `dateKey` = วันนี้)
- แต้มที่แจกวันนี้ (SUM `rewardPoints` ของวันนี้)
- ผู้ใช้ที่ทำภารกิจวันนี้ (COUNT DISTINCT `userId`)

ตัวเลือกเสริม: แต้มที่แจกรวม 7 วันล่าสุด เพื่อดูภาระต้นทุนแต้ม

### 2.3 ตารางจัดการภารกิจ (ส่วนหลัก)

คอลัมน์: ลำดับ (`sortOrder`), ชื่อภารกิจ + `slug`, ประเภทเป้าหมาย,
เป้าหมาย (`goalValue`), แต้มรางวัล, ปลายทางปุ่ม (`ctaHref`), สถานะเปิด/ปิด,
ยอดรับวันนี้, การจัดการ (แก้ไข / ลบ)

ความสามารถ:

- สลับเปิด/ปิดด้วย `Switch` แบบ inline (PATCH เฉพาะ `isActive`)
- เลื่อนลำดับขึ้น/ลง หรือแก้ `sortOrder` ในฟอร์ม (หน้า `nav-items` ใช้แบบแก้ตัวเลข
  ซึ่งง่ายกว่าและพอสำหรับภารกิจ 5-10 รายการ)
- ลบพร้อม `showDeleteConfirm` และเตือนว่าประวัติการรับรางวัลจะหายไปด้วย
  (FK เป็น `onDelete: cascade`) — ค่าเริ่มต้นควรแนะนำให้ "ปิดใช้งาน" แทนการลบ

### 2.4 Dialog ฟอร์มสร้าง/แก้ไข

ฟิลด์: `title`, `slug`, `description`, `goalType` (select จาก `QUEST_GOAL_TYPES`),
`goalValue`, `rewardPoints`, `ctaHref`, `sortOrder`, `isActive`

กติกาที่ฟอร์มต้องบังคับ (ตรงกับ logic ฝั่งผู้ใช้):

- `CHECK_IN` ต้องมี `goalValue` = 1 เท่านั้น เพราะ progress ถูก hardcode เป็น 1
  ใน `getProgressByGoalType()` ถ้าตั้ง > 1 ผู้ใช้จะกดรับไม่ได้ตลอดกาล
- `TOPUP_AMOUNT` หน่วยเป็นบาท (มาจาก `SUM(topups.amount)` แล้ว `Math.floor`)
  ต้องขึ้น label หน่วยให้ชัด และตรวจกับงาน money-satang ล่าสุดว่าหน่วยยังตรงกัน
- `PURCHASE_COUNT`, `GACHA_SPINS`, `SEASON_PASS_CLAIM` หน่วยเป็น "ครั้ง"
- `slug` เป็น unique: ต้องดักซ้ำแล้วขึ้นข้อความไทย ไม่ปล่อย `ER_DUP_ENTRY` หลุด
- `ctaHref` ต้องเป็น path ภายในเว็บเท่านั้น (ขึ้นต้นด้วย `/` และไม่ใช่ `//`)
  เพื่อกัน open redirect
- `rewardPoints` ต้อง > 0 และควรมีเพดานกันพิมพ์ผิด (เช่น 100000)
- แก้ `rewardPoints` ไม่มีผลย้อนหลัง เพราะ claim เก็บ snapshot ไว้แล้ว
  ควรมีข้อความบอกแอดมินในฟอร์ม

### 2.5 พรีวิวการ์ดภารกิจ (ทางเลือก แต่คุ้ม)

แสดงการ์ดแบบเดียวกับที่ผู้ใช้เห็นบน `/quests` ข้างฟอร์ม เพื่อกันข้อความยาวเกิน
หรือไอคอนไม่ตรงประเภท

### 2.6 หน้าย่อย /admin/quests/logs (ประวัติการรับรางวัล)

ตามแพตเทิร์น `admin/season-pass/logs`:

- ตาราง: วันที่ (`dateKey`), ผู้ใช้, ภารกิจ, แต้มที่ได้, เวลา
- ฟิลเตอร์: ช่วงวันที่, ภารกิจ, ค้นหาผู้ใช้
- แบ่งหน้า (pagination) เพราะตารางนี้โตวันละหลายแถวต่อผู้ใช้
- สรุปยอดแต้มรวมตามฟิลเตอร์ที่เลือก

## 3. งานฝั่งหลังบ้าน

### 3.1 Data layer

สร้าง `lib/features/quests/adminQuests.ts` แยกจาก `dailyQuests.ts`
(ไฟล์เดิมเป็นของฝั่งผู้ใช้ ไม่ควรบวม):

- `listAdminQuests()` — ภารกิจทั้งหมด + ยอด claim วันนี้ต่อภารกิจ
- `getQuestAdminStats()` — ตัวเลข KPI
- `createQuest()`, `updateQuest()`, `deleteQuest()`
- `listQuestClaims()` — ประวัติพร้อมฟิลเตอร์และ pagination

### 3.2 API routes

- `app/api/admin/quests/route.ts` — `GET` (list + stats), `POST` (create)
- `app/api/admin/quests/[id]/route.ts` — `PATCH` (update/toggle), `DELETE`
- `app/api/admin/quests/claims/route.ts` — `GET` ประวัติ

ทุกเส้นทางใช้แพตเทิร์นเดียวกับ `app/api/admin/promo-codes/route.ts`:

- อ่าน: `requirePermission(...)`
- เขียน: `requirePermissionWithCsrf(request, ...)`
- ตรวจ body ด้วย `validateBody()` + zod schema ใหม่ `lib/validations/quest.ts`
- บันทึก audit ด้วย `auditFromRequest()`

### 3.3 Validation

`lib/validations/quest.ts`: `questSchema` (create) และ `questUpdateSchema` (partial)
ครอบกติกาในข้อ 2.4 ทั้งหมด รวม refine `CHECK_IN` → `goalValue === 1`
และ refine `ctaHref` เป็น internal path

### 3.4 Audit log

เพิ่มใน `lib/auditLog.ts`:
`QUEST_CREATE`, `QUEST_UPDATE`, `QUEST_DELETE`
resource = `"DailyQuest"`, `resourceName` = `slug`

### 3.5 Permission

สองทางเลือก:

- ใช้ `CONTENT_VIEW` / `CONTENT_EDIT` ที่มีอยู่ — แก้น้อยที่สุด ไม่ต้องแตะ role
- เพิ่ม `QUEST_VIEW` / `QUEST_EDIT` ใหม่ ตามแบบ `SEASON_PASS_*`

แนะนำแบบที่สอง เพราะภารกิจคือช่องทางแจกแต้ม (กระทบเศรษฐกิจในระบบ)
ไม่ควรอยู่รวมกับสิทธิ์แก้คอนเทนต์ทั่วไป งานที่ต้องทำเมื่อเลือกแบบนี้:

- `lib/permissions.ts`: เพิ่มค่าใน `PERMISSIONS`,
  เพิ่ม `PERMISSION_DEPENDENCIES` (`QUEST_VIEW` → `ADMIN_PANEL`,
  `QUEST_EDIT` → `QUEST_VIEW`)
  หมายเหตุ: `ADMIN` ได้สิทธิ์ใหม่อัตโนมัติจาก `Object.values(PERMISSIONS)`
  ส่วน `MODERATOR` ต้องเพิ่มเองถ้าต้องการ
- `lib/adminAccess.ts`: เพิ่ม page rule `/admin/quests/logs`, `/admin/quests`
  และ API rule `/api/admin/quests`
- `app/(site)/admin/roles/page.tsx`: เพิ่ม label ไทยของ permission ใหม่
  (ต้องเช็คว่าหน้านี้มี map ของ label อยู่หรือไม่)

### 3.6 Migration

- ตรวจว่า production มีตาราง `DailyQuest` / `DailyQuestClaim` จริงหรือยัง
- ถ้ายังไม่มีไฟล์ migration ให้เพิ่ม `drizzle/00xx_daily_quests.sql`
  แบบ forward-only และ safe against partially migrated state
  (`CREATE TABLE IF NOT EXISTS`) ตามกติกาใน `drizzle/README.md`
- พิจารณา seed ภารกิจตั้งต้นใน `scripts/seeds/` (ยังไม่มี seed ของ quest)

## 4. ไฟล์ที่จะสร้าง / แก้

สร้าง:

- `app/(site)/admin/quests/page.tsx`
- `app/(site)/admin/quests/AGENTS.md`
- `app/(site)/admin/quests/logs/page.tsx`
- `app/api/admin/quests/route.ts`
- `app/api/admin/quests/[id]/route.ts`
- `app/api/admin/quests/claims/route.ts`
- `app/api/admin/quests/AGENTS.md`
- `lib/features/quests/adminQuests.ts`
- `lib/validations/quest.ts`
- `drizzle/00xx_daily_quests.sql` (ถ้ายืนยันว่ายังไม่มีตารางบน prod)
- `tests/api/admin-quests.test.ts`

แก้:

- `lib/permissions.ts`
- `lib/adminAccess.ts`
- `lib/auditLog.ts`
- `components/admin/AdminSidebar.tsx` (เมนู "ภารกิจรายวัน" ไอคอน `CalendarCheck`
  วางในกลุ่ม "จัดการร้าน" ใกล้ Season Pass)
- `app/(site)/admin/AGENTS.md` (เพิ่มลง feature map)
- `app/(site)/admin/roles/page.tsx` (label permission ใหม่)

## 5. ลำดับการทำงาน

1. Data layer + validation + migration (ยังไม่มี UI)
2. API 3 เส้นทาง + audit + permission + adminAccess
3. หน้า `/admin/quests` (ตาราง + ฟอร์ม + toggle)
4. เมนู sidebar + AGENTS.md
5. หน้า `/admin/quests/logs`
6. เทสต์และตรวจสอบ

## 6. การตรวจสอบ

- `npm run lint`
- `npm run test` (เพิ่มเทสต์: permission gate, CSRF, validation ของ `CHECK_IN`
  และ `ctaHref`, slug ซ้ำ)
- `npm run build`
- `npm run db:migrate` ถ้ามีไฟล์ migration ใหม่
- ตรวจด้วยมือ: สร้างภารกิจ → เปิดใช้งาน → เข้า `/quests` ด้วยบัญชีผู้ใช้ทั่วไป
  → ทำเงื่อนไขให้ครบ → กดรับ → กลับมาดูยอดใน KPI และหน้า logs

## 7. ประเด็นที่ต้องตัดสินใจก่อนเริ่ม

- ใช้ `CONTENT_*` หรือเพิ่ม `QUEST_VIEW` / `QUEST_EDIT` (แนะนำอย่างหลัง)
- ให้ลบภารกิจได้จริงหรือให้ปิดใช้งานอย่างเดียว (ลบแล้วประวัติ claim หายตาม cascade)
- ต้องการ soft delete แบบสินค้า (`deletedAt`) ด้วยหรือไม่
- หน้า logs ต้องส่งออก CSV ไหม (มี `PERMISSIONS.EXPORT_DATA` และหน้า export อยู่แล้ว)
