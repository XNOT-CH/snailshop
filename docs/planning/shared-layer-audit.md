# Shared Layer Audit

วันที่ตรวจ: 2026-05-07

## สรุปสั้น

โปรเจกต์นี้มีระบบส่วนกลางอยู่แล้ว แต่การใช้งานยังไม่สม่ำเสมอทุก domain

สถานะ practical closure: ปิดแล้ว 2026-05-20

ขอบเขตที่ปิด:

- ปิดงาน shared-layer audit แบบ practical แล้ว หลังทำ low-risk/medium-risk shared extraction, route response guard/helper, client helper, และ final audit หลาย phase
- ไม่มี step ถัดไปที่ควรทำต่อโดย default โดยไม่รับ requirement ใหม่ เพราะส่วนที่เหลือเป็นงานเสี่ยงสูงหรือเปลี่ยน contract ได้ง่าย
- step เก่าในเอกสารที่ยังมีข้อความเชิง historical เช่น "เริ่มทำ" ถูก supersede ด้วย baseline/full test รอบหลังแล้ว และไม่ถือเป็น active blocker ของ practical closure
- ถ้าจะทำต่อ ควรเปิดเป็นงานใหม่แบบ scoped requirement ต่อ domain เช่น transaction service extraction, response contract migration, หรือ UI validation consolidation พร้อม guard tests ก่อนแตะ production code

ส่วนที่เป็น shared layer ชัดเจน:

- `components/ui/*` เป็น design system primitives
- `lib/permissions.ts`, `lib/adminAccess.ts`, `proxy.ts`, `auth.config.ts`, `lib/auth.ts` เป็นแกนกลางของ auth และ permission
- `lib/validations/*` รวม Zod schema หลาย domain
- `lib/features/products/*`, `lib/features/promo/*`, `lib/features/orders/*` เริ่มแยก business logic ออกจาก route แล้ว
- `lib/cache.ts`, `lib/currencySettings.ts`, `lib/getSiteSettings.ts`, `lib/getCurrencySettings.ts`, `lib/utils/date.ts` เป็น utility/service ที่ถูกใช้ซ้ำจริง

จุดที่ควรปรับต่อ:

- API route จำนวนมากยังมี DB/business logic อยู่ใน `app/api/**/route.ts`
- มี helper สำหรับ response/validation หลายชุดที่หน้าที่ทับกัน
- client component หลายจุดเรียก `fetch("/api/...")` และจัดการ success/error ซ้ำกัน
- UI เฉพาะทางบางชุดมี logic ซ้ำ เช่น crop dialog, purchase button, product discount form, auth form, email layout

## ข้อมูลจากการสแกน

- ตรวจไฟล์ `.ts`, `.tsx`, `.mts` ใต้ `app`, `components`, `lib`, `hooks`, `types` รวมประมาณ 434 ไฟล์
- พบ API route handler `app/api/**/route.ts` ประมาณ 106 ไฟล์
- route ที่ import DB โดยตรงและไม่ได้ผ่าน `lib/features/*` มีประมาณ 64 ไฟล์
- route ที่มี business logic ใหญ่และควรแยกก่อน:
  - `app/api/topup/route.ts` ประมาณ 908 บรรทัด
  - `app/api/gacha/roll/route.ts` ประมาณ 730 บรรทัด
  - `app/api/dashboard/topup-summary/route.ts` ประมาณ 438 บรรทัด
  - `app/api/gacha/grid/roll/route.ts` ประมาณ 308 บรรทัด
  - `app/api/admin/export/route.ts` ประมาณ 255 บรรทัด

## จุดซ้ำที่ควรแก้ก่อน

### 1. API response และ validation helper ซ้ำกัน

ไฟล์ที่เกี่ยวข้อง:

- `lib/api.ts`
- `lib/apiSecurity.ts`
- `lib/validations/validate.ts`

ปัญหา:

- `lib/api.ts` และ `lib/apiSecurity.ts` มี `apiSuccess` / `apiError` เหมือนกันแต่ shape response ไม่เหมือนกัน
- `lib/api.ts` มี `parseBody` ส่วน `lib/validations/validate.ts` มี `validateBody` ทำงานคล้ายกัน
- route ส่วนใหญ่ยังใช้ `NextResponse.json(...)` เอง ทำให้ response format กระจาย
- error message ซ้ำ เช่น `"Unauthorized"` พบหลายสิบจุดใน route

แนะนำ:

- เลือก response contract ชุดเดียว เช่น `{ success, message, data, errors, errorCode }`
- รวม helper เป็นจุดเดียว เช่น `lib/api.ts` หรือแตกเป็น `lib/api/response.ts` และ `lib/api/validation.ts`
- ค่อย ๆ migrate route ที่แก้บ่อยก่อน ไม่จำเป็นต้องแก้ทั้ง 106 route พร้อมกัน

Priority: สูง

### 2. API route ยังเป็น business logic layer มากเกินไป

ตัวอย่างไฟล์:

- `app/api/topup/route.ts`
- `app/api/gacha/roll/route.ts`
- `app/api/gacha/grid/roll/route.ts`
- `app/api/dashboard/topup-summary/route.ts`
- `app/api/admin/users/[id]/route.ts`

ปัญหา:

- route handler มีทั้ง auth, validation, DB query, transaction, domain rules, response formatting ในไฟล์เดียว
- test ยาก เพราะ business logic ผูกกับ `Request` / `NextResponse`
- มี `lib/features/*` อยู่แล้ว แต่ใช้กับบาง domain เท่านั้น เช่น products, promo, orders

แนะนำ:

- ให้ route handler เหลือหน้าที่บาง ๆ: read request, auth, call service, return response
- เพิ่ม service ตาม domain:
  - `lib/features/topup/*`
  - `lib/features/gacha/*`
  - `lib/features/dashboard/*`
  - `lib/features/content/*`
- เริ่มจาก route ที่ใหญ่และมีความเสี่ยงสูง เช่น topup และ gacha roll

Priority: สูง

### 3. Purchase flow ซ้ำใน client component หลายไฟล์

ไฟล์ที่พบ pattern ซ้ำ:

- `components/BuyButton.tsx`
- `components/FeaturedProducts.tsx`
- `components/ProductActions.tsx`
- `components/ProductCard.tsx`
- `components/SaleProducts.tsx`

Pattern ที่ซ้ำ:

- เรียก `/api/purchase`
- parse `response.json()`
- ถ้า success เรียก `showPurchaseSuccessModal`
- redirect ไปหน้าสินค้าที่ซื้อหรือแสดง error

แนะนำ:

- สร้าง hook หรือ service ฝั่ง client เช่น `hooks/usePurchaseProduct.ts`
- หรือสร้าง component กลาง เช่น `components/purchase/PurchaseButton.tsx`
- ให้ component แต่ละหน้าเหลือแค่ส่ง `productId`, `quantity`, และ callback หลังซื้อสำเร็จ

Priority: สูง

### 4. Product discount helper ซ้ำระหว่างหน้า create/edit

ไฟล์ที่เกี่ยวข้อง:

- `app/admin/products/new/page.tsx`
- `app/admin/products/[id]/edit/page.tsx`

function ที่ซ้ำหรือใกล้กัน:

- `normalizeMoney`
- `formatDiscountValue`
- `getCalculatedDiscountPrice`
- `getNormalizedDiscountPrice`
- helper กลุ่ม `getDiscount*`

แนะนำ:

- ย้าย pure logic ไปที่ `lib/features/products/pricing.ts`
- ถ้า UI form เหมือนกันมาก ให้ต่อยอดเป็น `components/admin/ProductDiscountFields.tsx`
- เพิ่ม unit test ให้ pricing helper เพราะเป็น logic เงิน

Priority: สูง

### 5. Gacha reward mapping และ roll helper ซ้ำ

ไฟล์ที่เกี่ยวข้อง:

- `app/gacha/page.tsx`
- `app/gacha/play/page.tsx`
- `app/gacha/[id]/page.tsx`
- `app/api/gacha/roll/route.ts`
- `app/api/gacha/grid/roll/route.ts`

Pattern ที่พบ:

- mapping reward เป็น product-like object ซ้ำในหลายหน้า
- `fetchUserOrError` และ `checkDailySpinLimit` มีใน roll route มากกว่า 1 จุด
- `toMySQLDatetime` โผล่ทั้งใน gacha route และ promo shared ทั้งที่ `lib/utils/date.ts` มี `mysqlNow` แล้ว

แนะนำ:

- สร้าง `lib/features/gacha/rewards.ts` สำหรับ reward mapping
- สร้าง `lib/features/gacha/limits.ts` สำหรับ daily spin limit
- รวม datetime helper ใน `lib/utils/date.ts` เช่น `toMySQLDatetime(date)`
- ให้ roll route เรียก service กลางแทนการมี helper ส่วนตัว

Priority: สูง

### 6. Crop dialog ซ้ำระหว่าง profile และ gacha

ไฟล์ที่เกี่ยวข้อง:

- `components/profile/FreeCropDialog.tsx`
- `components/gacha/RewardImageCropDialog.tsx`

Pattern ที่พบ:

- `ResizeHandle`
- `CropRect`
- `getHandlePosition`
- drag/resize logic
- canvas crop/export logic
- output size 768 และ preview crop คล้ายกัน

แนะนำ:

- แยก hook เช่น `components/image-crop/useSquareCrop.ts`
- แยก UI กลาง เช่น `components/image-crop/SquareCropDialog.tsx`
- ให้ profile/gacha ส่ง config เช่น title, description, output filename, mime type

Priority: กลางถึงสูง

### 7. API endpoint string และ storage key ยังไม่รวมศูนย์

ตัวอย่าง endpoint ที่ซ้ำ:

- `/api/purchase` ใช้ในหลาย purchase component
- `/api/upload` ใช้ใน news, popup, settings, product image gallery
- `/api/admin/gacha-rewards` และ `/api/admin/gacha-rewards/upload-image` ใช้ในหลายหน้า admin gacha
- `/api/csrf` ใช้ทั้ง `lib/csrf-client.ts` และ `hooks/useCsrfToken.ts`

storage key:

- `gacha-skip-animation` ใช้ใน `components/GachaGridMachine.tsx` และ `components/GachaRhombus.tsx`

แนะนำ:

- เพิ่ม `lib/constants/apiRoutes.ts`
- เพิ่ม `lib/constants/storageKeys.ts`
- เพิ่ม `lib/constants/gacha.ts` สำหรับ tier, label, color, localStorage key

Priority: กลาง

### 8. Auth form layout และ Turnstile UI ซ้ำ

ไฟล์ที่เกี่ยวข้อง:

- `app/login/LoginForm.tsx`
- `app/register/RegisterForm.tsx`
- `app/forgot-password/ForgotPasswordForm.tsx`
- `app/reset-password/ResetPasswordForm.tsx`

Pattern ที่พบ:

- logo block ซ้ำ
- card/form shell คล้ายกัน
- Turnstile field ซ้ำใน login/register/forgot password

แนะนำ:

- สร้าง `components/auth/AuthFormShell.tsx`
- สร้าง `components/auth/TurnstileField.tsx`
- แยก submit state/error renderer เป็น helper หรือ component เล็ก

Priority: กลาง

### 9. Email template style ซ้ำ

ไฟล์ที่เกี่ยวข้อง:

- `components/emails/EmailVerificationEmail.tsx`
- `components/emails/NotificationEmail.tsx`
- `components/emails/PasswordResetEmail.tsx`
- `components/emails/PurchaseReceiptEmail.tsx`

Pattern ที่พบ:

- style object เช่น `main`, font family, container/card style ซ้ำ
- layout structure คล้ายกัน

แนะนำ:

- สร้าง `components/emails/EmailLayout.tsx`
- สร้าง `components/emails/emailStyles.ts`

Priority: กลาง

### 10. Formatter กลางยังไม่ครบ

function ที่พบซ้ำ:

- `formatCurrency` ใน `app/admin/users/AdminUsersClient.tsx`, `app/dashboard/topup/page.tsx`, `components/admin/RevenueAreaChart.tsx`
- `formatThaiDate` ใน `components/LiveDateTime.tsx`, `lib/seasonPass.ts`, `lib/seasonPassTransactions.ts`
- `escapeHtml` ใน `app/admin/users/AdminUsersClient.tsx` ทั้งที่มี `lib/sanitize.ts`

แนะนำ:

- เพิ่ม `lib/formatters/currency.ts`
- เพิ่ม `lib/formatters/date.ts` หรือขยาย `lib/utils/date.ts`
- ใช้ `lib/sanitize.ts` เป็นที่เดียวสำหรับ HTML escaping/sanitizing

Priority: กลาง

## สิ่งที่ทำดีแล้ว

- `components/ui/*` ช่วยลดการสร้าง primitive ซ้ำได้ดี
- `lib/permissions.ts` กับ `lib/adminAccess.ts` ทำหน้าที่เป็น policy layer ชัดเจน
- `proxy.ts` และ `auth.config.ts` ใช้ access control กลางก่อนถึง page/API
- `lib/validations/*` เริ่มรวม schema ได้ดี โดยเฉพาะ content, gacha, product, promo, settings, topup, user
- `lib/features/products/*`, `lib/features/promo/*`, `lib/features/orders/*` เป็นทิศทางที่ดี ควรขยาย pattern นี้ไป domain อื่น

## Refactor roadmap ที่แนะนำ

### Phase 1: Low risk, ได้ผลเร็ว

1. รวม constants:
   - `lib/constants/apiRoutes.ts`
   - `lib/constants/storageKeys.ts`
   - `lib/constants/gacha.ts`
2. รวม formatter:
   - currency
   - Thai date
   - MySQL datetime
3. รวม product discount pure helpers และเพิ่ม unit test

เหตุผล: เป็น pure/shared code แก้ง่าย ความเสี่ยงต่ำ และลด duplication เห็นผลเร็ว

### Phase 2: Client shared services/components

1. สร้าง purchase hook/component กลาง
2. สร้าง upload client helper สำหรับ `/api/upload`
3. สร้าง admin gacha rewards client helper
4. แยก Auth form shell และ Turnstile field
5. แยก Email layout/style

เหตุผล: ลดโค้ด UI ซ้ำและทำให้ behavior เช่น success modal/error handling เหมือนกันทุกหน้า

### Phase 3: API contract และ route cleanup

1. ตัดสินใจ response shape กลาง
2. รวม `parseBody` / `validateBody`
3. migrate route ที่แก้บ่อยก่อน เช่น auth/register/content/admin gacha
4. เพิ่ม helper สำหรับ error handling และ audit logging ที่ใช้ซ้ำได้

เหตุผล: ต้องระวัง consumer ที่อ่าน response shape เดิม จึงควรทำเป็นรอบ ๆ

### Phase 4: Domain service extraction

1. `lib/features/topup/*`
2. `lib/features/gacha/*`
3. `lib/features/dashboard/*`
4. `lib/features/content/*`

เหตุผล: เป็น phase ที่ impact สูงที่สุด แต่จะช่วยลดขนาด route handler และเพิ่ม testability มากที่สุด

## แผนแบ่งงานเป็น Step

ใช้ section นี้เป็น checklist ก่อนเริ่มงานแต่ละชิ้น เพื่อไม่ให้ refactor กระจายเกินไป

### Step 0: อัปเดตเอกสารก่อนเริ่มงานล่าสุด

สิ่งที่ต้องทำก่อนลงโค้ด:

- อัปเดต note นี้ว่ากำลังจะทำ step ไหน
- ระบุไฟล์ที่จะสร้างหรือแก้
- ระบุ shared artifact หรือ skill ใหม่ที่จะเพิ่ม
- ระบุ test ที่ต้องรันหลังทำเสร็จ
- เช็กว่า `.obsidian/workspace.json` ไม่ถูก stage ถ้าเป็นแค่ workspace state

ผลลัพธ์ที่คาดหวัง:

- คนอ่านรู้ก่อนว่า refactor รอบนี้แตะอะไร
- ลดโอกาสเผลอแก้หลาย domain พร้อมกัน

### Step 6.1: Dashboard topup summary query helpers

สถานะล่าสุด: เสร็จแล้ว 2026-05-07

เป้าหมาย:

- เริ่มแยก `lib/features/dashboard/*` จาก route ใหญ่ถัดไปหลัง Topup/Gacha phase
- ย้าย read-only query/data-shaping helper จาก `app/api/dashboard/topup-summary/route.ts`
- ให้ route เหลือ auth check, request boundary, และ `NextResponse.json(...)` เป็นหลัก

ไฟล์ที่จะสร้าง:

- `lib/features/dashboard/topupSummary.ts`
- `tests/lib/dashboardTopupSummary.test.ts`

ไฟล์ที่จะแก้ในรอบนี้:

- `app/api/dashboard/topup-summary/route.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ย้ายเฉพาะ read-only query/data-shaping/date/search/sort/pagination helper
- ไม่เปลี่ยน production behavior, response shape, auth behavior, date range behavior, masking, slip image URL behavior, หรือ legacy test mode behavior
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped refactor และยืนยันด้วย focused/full tests แทน

test หลังทำ:

- focused unit test ของ dashboard topup summary helper: ผ่าน 1 file / 5 tests
- focused dashboard/topup-summary API tests: ผ่าน 6 files / 87 tests
- `npm test`: ผ่าน 112 files / 1394 tests, skipped 6
- `npm run lint`: ผ่าน

สิ่งที่แก้ใน Step 6.1:

- สร้าง `lib/features/dashboard/topupSummary.ts` สำหรับ read-only query/data-shaping/date/search/sort/pagination helper ของ dashboard topup summary
- ย้าย helper เช่น bank color, date range, selected days, legacy summary mode, summary response builder, legacy query path, และ production query path ออกจาก route
- สร้าง `tests/lib/dashboardTopupSummary.test.ts` เพื่อ lock selected days parsing, date range behavior, date/day filters, bank color fallback, summary totals, pagination, payment method, และ record shape
- ปรับ `app/api/dashboard/topup-summary/route.ts` ให้เหลือ auth/admin guard, request boundary, call `getDashboardTopupSummary`, และ `NextResponse.json(...)`
- ไม่เปลี่ยน production behavior, response shape, auth behavior, date range behavior, masking, slip image URL behavior, หรือ legacy test mode behavior
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 6.2: Dashboard topup summary cleanup and final audit

สถานะล่าสุด: เสร็จแล้ว 2026-05-07

เป้าหมาย:

- cleanup `app/api/dashboard/topup-summary/route.ts` และ `lib/features/dashboard/topupSummary.ts` หลังแยก helper ใน Step 6.1
- ปรับเฉพาะ import/flow/readability/test naming ที่ไม่เปลี่ยน production behavior
- สรุปว่า dashboard topup summary extraction phase นี้ปิดได้หรือยัง

ไฟล์ที่จะสร้าง:

- ไม่มี

ไฟล์ที่จะแก้ในรอบนี้:

- `app/api/dashboard/topup-summary/route.ts`
- `lib/features/dashboard/topupSummary.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ไม่ย้าย logic เพิ่มถ้าไม่จำเป็น
- ไม่เปลี่ยน production behavior, response shape, auth behavior, date range behavior, masking, slip image URL behavior, หรือ legacy test mode behavior
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped refactor และยืนยันด้วย focused/full tests แทน

test หลังทำ:

- focused dashboard/topup-summary tests
- `npm test`
- `npm run lint`

ผลลัพธ์หลังทำ:

- cleanup `app/api/dashboard/topup-summary/route.ts` ให้ role guard อ่านง่ายขึ้น โดยแยก `userRole` ออกจาก conditional
- cleanup `lib/features/dashboard/topupSummary.ts` ให้ pagination parsing อ่านง่ายขึ้น โดยแยก raw page/pageSize ก่อน clamp ค่า
- ไม่ย้าย logic เพิ่ม และไม่เปลี่ยน production behavior, response shape, auth behavior, date range behavior, masking, slip image URL behavior, หรือ legacy test mode behavior
- dashboard topup summary extraction phase ปิดได้: route เหลือเป็น auth/request boundary + call shared helper + response ส่วน read-only query/data-shaping อยู่ใน shared helper แล้ว

ผล test:

- focused dashboard/topup-summary tests: ผ่าน 6 files / 87 tests
- `npm test`: ผ่าน 112 files / 1394 tests, skipped 6
- `npm run lint`: ผ่าน

### Step 7.1: Admin export query/data builders

สถานะล่าสุด: เสร็จแล้ว 2026-05-07

เป้าหมาย:

- แยก helper/service ของ `app/api/admin/export/route.ts` เฉพาะส่วน query/data-shaping/export payload ที่เป็น pure หรือ read-only
- ให้ route เหลือ permission guard, request boundary, date/table validation boundary, และ response creation เป็นหลัก
- เพิ่ม unit test ให้ helper ที่แยกได้โดย lock CSV escaping/BOM/date range behavior เดิม

ไฟล์ที่จะสร้าง:

- `lib/features/admin/exportData.ts`
- `tests/lib/adminExport.test.ts`

ไฟล์ที่จะแก้ในรอบนี้:

- `app/api/admin/export/route.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ไม่เปลี่ยน production behavior, auth behavior, permission logic, response shape, CSV export format, filename format, row limit header, หรือ error message/status
- ไม่ย้าย logic ที่ผูกกับ `NextResponse` เข้า shared helper
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped refactor และยืนยันด้วย focused/full tests แทน

test หลังทำ:

- focused admin export tests
- focused unit test ของ admin export helper
- `npm test`
- `npm run lint`

ผลลัพธ์หลังทำ:

- สร้าง `lib/features/admin/exportData.ts` สำหรับ export table guard, unknown table message, date range validation, CSV escaping/BOM builder, row limit constant, และ read-only export payload query ของ orders/users/topups/gacha/products
- ปรับ `app/api/admin/export/route.ts` ให้เหลือ permission guard, request/searchParams boundary, error response, และ CSV `NextResponse` boundary โดยยังใช้ `requirePermission(PERMISSIONS.EXPORT_DATA)` และ response status/message เดิม
- สร้าง `tests/lib/adminExport.test.ts` เพื่อ lock CSV escaping, UTF-8 BOM/CRLF/header order, missing cell behavior, date range message, และ supported table guard
- ไม่เปลี่ยน production behavior, auth behavior, permission logic, response shape, CSV export format, filename format, row limit header, หรือ error message/status
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

ผล test:

- focused admin export tests: ผ่าน 2 files / 59 tests
- `npm test`: ผ่าน 113 files / 1398 tests, skipped 6
- `npm run lint`: ผ่าน

### Step 7.2: Admin export cleanup and final audit

สถานะล่าสุด: เสร็จแล้ว 2026-05-07

เป้าหมาย:

- cleanup `app/api/admin/export/route.ts` และ `lib/features/admin/exportData.ts` หลังแยก helper ใน Step 7.1
- ปรับเฉพาะ import/flow/readability/test naming ที่ไม่เปลี่ยน production behavior
- สรุปว่า admin export extraction phase นี้ปิดได้หรือยัง

ไฟล์ที่จะสร้าง:

- ไม่มี

ไฟล์ที่จะแก้ในรอบนี้:

- `app/api/admin/export/route.ts`
- `lib/features/admin/exportData.ts`
- `tests/lib/adminExport.test.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ไม่ย้าย logic เพิ่มถ้าไม่จำเป็น
- ไม่เปลี่ยน production behavior, auth behavior, permission logic, response shape, CSV export format, filename format, row limit header, หรือ error message/status
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped refactor และยืนยันด้วย focused/full tests แทน

test หลังทำ:

- focused admin export tests
- `npm test`
- `npm run lint`

ผลลัพธ์หลังทำ:

- cleanup `lib/features/admin/exportData.ts` ให้รายชื่อ supported export table มี source of truth เดียวผ่าน `ADMIN_EXPORT_TABLE_NAMES`
- cleanup CSV helper ให้ตัวแปร `cellText` อ่านเจตนาชัดขึ้น โดยไม่เปลี่ยน escaping behavior
- cleanup `app/api/admin/export/route.ts` ให้ destructure `{ csv, filename }` จาก service ก่อนส่งเข้า `csvResponse`
- ปรับชื่อ test ใน `tests/lib/adminExport.test.ts` ให้ชัดว่า unknown table message ต้อง compatible กับ route เดิม
- ไม่ย้าย logic เพิ่ม และไม่เปลี่ยน production behavior, auth behavior, permission logic, response shape, CSV export format, filename format, row limit header, หรือ error message/status
- admin export extraction phase ปิดได้: route เหลือ permission/request/error/CSV response boundary ส่วน read-only query/data-shaping และ CSV payload builder อยู่ใน shared helper แล้ว
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

ผล test:

- focused admin export tests: ผ่าน 2 files / 59 tests
- `npm test`: ผ่าน 113 files / 1398 tests, skipped 6
- `npm run lint`: ผ่าน

### Step 8.1: Shared image crop hook/helper

สถานะล่าสุด: เสร็จแล้ว 2026-05-07

เป้าหมาย:

- ตรวจ duplication ระหว่าง `components/profile/FreeCropDialog.tsx` และ `components/gacha/RewardImageCropDialog.tsx`
- แยก shared crop helper สำหรับ state math/drag/resize/source mapping ที่เป็น pure ได้ก่อน
- ยังไม่รวม UI เป็น component กลางถ้าทำให้เสี่ยงเปลี่ยน production behavior หรือ preview/output behavior

ไฟล์ที่จะสร้าง:

- `components/image-crop/squareCrop.ts`
- `tests/lib/imageCrop.test.ts`

ไฟล์ที่จะแก้ในรอบนี้:

- `components/profile/FreeCropDialog.tsx`
- `components/gacha/RewardImageCropDialog.tsx`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ไม่เปลี่ยน production behavior, UI behavior, output size, filename, mime type, preview size, preview behavior, หรือ dialog copy/style
- แยกเฉพาะ helper ที่ไม่ผูกกับ React component tree, `NextResponse`, upload flow, หรือ DOM event wiring โดยตรง
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped refactor และยืนยันด้วย focused/full tests แทน

test หลังทำ:

- focused crop helper/component tests
- `npm test`
- `npm run lint`

ผลลัพธ์หลังทำ:

- สร้าง `components/image-crop/squareCrop.ts` สำหรับ shared pure helper ของ square crop เช่น handle list/position, centered crop rect, clamp/resize math, natural/display source mapping, และ mime extension fallback
- ปรับ `components/profile/FreeCropDialog.tsx` ให้ใช้ shared helper สำหรับ crop math/source mapping/handle position แต่ยังคง UI copy/style, preview flow, output size 768, filename fallback, และ mime type behavior เดิม
- ปรับ `components/gacha/RewardImageCropDialog.tsx` ให้ใช้ shared helper ชุดเดียวกัน แต่ยังคง UI copy/style, preview flow, output size 768, filename `.png`, และ mime type behavior เดิม
- สร้าง `tests/lib/imageCrop.test.ts` เพื่อ lock handle order/position, centered crop behavior, move/resize anchor math, source mapping, และ extension fallback
- ยังไม่รวม UI เป็น shared component ในรอบนี้ เพราะ dialog สองตัวมี layout/style/copy ต่างกัน และการแยก pure helper ปลอดภัยกว่า
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

ผล test:

- focused crop helper tests: ผ่าน 1 file / 6 tests
- `npm test`: ผ่าน 114 files / 1404 tests, skipped 6
- `npm run lint`: ผ่าน

### Step 8.2: Image crop cleanup and final audit

สถานะล่าสุด: เสร็จแล้ว 2026-05-08

เป้าหมาย:

- cleanup `components/profile/FreeCropDialog.tsx`, `components/gacha/RewardImageCropDialog.tsx` และ `components/image-crop/squareCrop.ts` หลังแยก helper ใน Step 8.1
- ปรับเฉพาะ import/flow/readability/test naming ที่ไม่เปลี่ยน production behavior
- สรุปว่า image crop helper phase นี้ปิดได้หรือยัง และยังไม่รวม UI เป็น shared component ถ้าไม่จำเป็น

ไฟล์ที่จะสร้าง:

- ไม่มี

ไฟล์ที่จะแก้ในรอบนี้:

- `components/profile/FreeCropDialog.tsx`
- `components/gacha/RewardImageCropDialog.tsx`
- `components/image-crop/squareCrop.ts`
- `tests/lib/imageCrop.test.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ไม่เปลี่ยน production behavior, UI behavior, output size, filename, mime type, preview behavior หรือ dialog copy/style
- ไม่รวม UI เป็น shared component ถ้าไม่จำเป็น
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped refactor และยืนยันด้วย focused/full tests แทน

test หลังทำ:

- focused crop tests
- `npm test`
- `npm run lint`

ผลลัพธ์หลังทำ:

- cleanup `components/image-crop/squareCrop.ts` ให้ `getSquareCropHandlePosition` ใช้ lookup table จาก `SQUARE_CROP_HANDLE_POSITIONS` แทน conditional chain โดยยังคืน class string เดิม
- cleanup `components/profile/FreeCropDialog.tsx` โดยเอา type alias ซ้ำออก และตั้ง `OUTPUT_SIZE = 768` ให้ output canvas size อ่านชัดขึ้นโดยไม่เปลี่ยนค่าเดิม
- cleanup `components/gacha/RewardImageCropDialog.tsx` โดยเอา type alias ซ้ำออก และตั้ง `OUTPUT_SIZE = 768` ให้ output canvas size อ่านชัดขึ้นโดยไม่เปลี่ยนค่าเดิม
- ไม่รวม UI เป็น shared component ในรอบนี้ เพราะ pure helper ลด duplication จุดเสี่ยงหลักแล้ว และ dialog copy/style/layout ยังต่างกัน
- image crop helper phase ปิดได้: crop math/source mapping/handle position/extension fallback อยู่ใน shared helper แล้ว ส่วน UI/preview/export wiring ยังอยู่ใน dialog เดิมเพื่อรักษา behavior
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

ผล test:

- focused crop tests: ผ่าน 1 file / 6 tests
- `npm test`: ผ่าน 114 files / 1404 tests, skipped 6
- `npm run lint`: ผ่าน

### Step 9.1: Auth form shell and Turnstile field

สถานะล่าสุด: เสร็จแล้ว 2026-05-08

เป้าหมาย:

- ตรวจ duplication ระหว่าง `app/login/LoginForm.tsx`, `app/register/RegisterForm.tsx`, `app/forgot-password/ForgotPasswordForm.tsx` และ `app/reset-password/ResetPasswordForm.tsx`
- แยก shared UI shell/header/logo block และ Turnstile field เฉพาะส่วนที่ปลอดภัย
- ไม่แตะ form validation, submit flow, auth API calls, redirect behavior หรือ Turnstile token/reset behavior

ไฟล์ที่จะสร้าง:

- `components/auth/AuthFormShell.tsx`
- `components/auth/TurnstileField.tsx`
- `tests/components/auth-shared.test.tsx`

ไฟล์ที่จะแก้ในรอบนี้:

- `app/login/LoginForm.tsx`
- `app/register/RegisterForm.tsx`
- `app/forgot-password/ForgotPasswordForm.tsx`
- `app/reset-password/ResetPasswordForm.tsx`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ไม่เปลี่ยน production behavior, form validation, submit flow, auth API calls, Turnstile behavior, copy, redirect behavior หรือ visual layout
- ถ้า flow ผูกกันมากเกินไป ให้แยกเฉพาะ UI shell/helper ที่ปลอดภัยก่อน
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped refactor และยืนยันด้วย focused/full tests แทน

test หลังทำ:

- focused auth form/shared component tests
- `npm test`
- `npm run lint`

ผลลัพธ์หลังทำ:

- สร้าง `components/auth/AuthFormShell.tsx` สำหรับ shared wrapper/card/header/logo fallback ที่ใช้ class/copy slot เดิมจาก auth forms
- สร้าง `components/auth/TurnstileField.tsx` สำหรับ Turnstile widget + error alert block เดิม โดยยังรับ `enabled`, `resetSignal`, `onTokenChange` และ error จากแต่ละ form เหมือนเดิม
- ปรับ `app/login/LoginForm.tsx`, `app/register/RegisterForm.tsx`, `app/forgot-password/ForgotPasswordForm.tsx` และ `app/reset-password/ResetPasswordForm.tsx` ให้ใช้ `AuthFormShell`
- ปรับ login/register/forgot-password ให้ใช้ `TurnstileField` โดยไม่เปลี่ยน token state, reset signal, disabled state, submit flow หรือ error copy
- สร้าง `tests/components/auth-shared.test.tsx` เพื่อ lock shell title/subtitle/logo/content slot, logo fallback และ Turnstile enabled/error/reset/token callback behavior
- ไม่เปลี่ยน production behavior, form validation, submit flow, auth API calls, Turnstile behavior, copy, redirect behavior หรือ visual layout
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

ผล test:

- focused auth form/shared component tests: ผ่าน 4 files / 27 tests
- `npm test`: ผ่าน 115 files / 1408 tests, skipped 6
- `npm run lint`: ผ่าน

### Step 9.2: Auth form cleanup and final audit

สถานะล่าสุด: เสร็จแล้ว 2026-05-08

เป้าหมาย:

- cleanup `app/login/LoginForm.tsx`, `app/register/RegisterForm.tsx`, `app/forgot-password/ForgotPasswordForm.tsx`, `app/reset-password/ResetPasswordForm.tsx` และ `components/auth/*` หลังแยก shared shell/Turnstile ใน Step 9.1
- ปรับเฉพาะ import/flow/readability/test naming ที่ไม่เปลี่ยน production behavior
- สรุปว่า auth form shared component phase นี้ปิดได้หรือยัง

ไฟล์ที่จะสร้าง:

- ไม่มี

ไฟล์ที่จะแก้ในรอบนี้:

- `app/login/LoginForm.tsx`
- `app/register/RegisterForm.tsx`
- `components/auth/AuthFormShell.tsx`
- `tests/components/auth-shared.test.tsx`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ไม่เปลี่ยน production behavior, form validation, submit flow, auth API calls, Turnstile behavior, copy, redirect behavior หรือ visual layout
- ไม่แยก submit/helper เพิ่มถ้าไม่จำเป็น
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped refactor และยืนยันด้วย focused/full tests แทน

test หลังทำ:

- focused auth form tests
- `npm test`
- `npm run lint`

ผลลัพธ์หลังทำ:

- cleanup `components/auth/AuthFormShell.tsx` ให้ใช้ `import type { ReactNode } from "react"` แทน `React.ReactNode` เพื่อให้ type dependency ชัดขึ้น
- cleanup `app/login/LoginForm.tsx` และ `app/register/RegisterForm.tsx` ให้ปุ่ม show password ใช้ functional state toggle เหมือน pattern ที่ใช้อยู่ใน reset password form
- cleanup `tests/components/auth-shared.test.tsx` โดยปรับชื่อ describe ให้ตรงกับ path `components/auth`
- ไม่แยก submit/helper เพิ่ม และไม่เปลี่ยน production behavior, form validation, submit flow, auth API calls, Turnstile behavior, copy, redirect behavior หรือ visual layout
- auth form shared component phase ปิดได้: wrapper/card/header/logo fallback และ Turnstile widget/error block อยู่ใน shared components แล้ว ส่วน form state/validation/submit flow ยังอยู่ในแต่ละ form เพื่อรักษา behavior
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

ผล test:

- focused auth form tests: ผ่าน 4 files / 27 tests
- `npm test`: ผ่าน 115 files / 1408 tests, skipped 6
- `npm run lint`: ผ่าน

### Step 10.1: Email layout and shared styles

สถานะล่าสุด: เสร็จแล้ว 2026-05-08

เป้าหมาย:

- ตรวจ duplication ระหว่าง `components/emails/EmailVerificationEmail.tsx`, `components/emails/NotificationEmail.tsx`, `components/emails/PasswordResetEmail.tsx` และ `components/emails/PurchaseReceiptEmail.tsx`
- แยก shared `EmailLayout` สำหรับโครง `Html/Head/Preview/Body/Container`
- แยก `emailStyles` เฉพาะ style constants ที่ซ้ำหรือใกล้กัน โดยรักษาค่า style เดิมของแต่ละ template

ไฟล์ที่จะสร้าง:

- `components/emails/EmailLayout.tsx`
- `components/emails/emailStyles.ts`
- `tests/components/email-shared.test.tsx`

ไฟล์ที่จะแก้ในรอบนี้:

- `components/emails/EmailVerificationEmail.tsx`
- `components/emails/NotificationEmail.tsx`
- `components/emails/PasswordResetEmail.tsx`
- `components/emails/PurchaseReceiptEmail.tsx`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ไม่เปลี่ยน production behavior, subject/content/copy, link behavior, formatting, email preview output หรือ props contract
- ถ้า template ต่างกันมาก ให้แยกเฉพาะ style constants/helper ที่ปลอดภัยก่อน
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped refactor และยืนยันด้วย focused/full tests แทน

test หลังทำ:

- focused email tests
- `npm test`
- `npm run lint`

ผลลัพธ์หลังทำ:

- สร้าง `components/emails/EmailLayout.tsx` สำหรับ shared email wrapper ของ `Html`, `Head`, `Preview`, `Body` และ `Container`
- สร้าง `components/emails/emailStyles.ts` สำหรับ shared style constants โดยแยก variant ที่รักษาค่าเดิม เช่น base container, narrow container, transactional text, receipt text, primary button และ break-all link
- ปรับ `components/emails/EmailVerificationEmail.tsx`, `components/emails/PasswordResetEmail.tsx`, `components/emails/NotificationEmail.tsx` และ `components/emails/PurchaseReceiptEmail.tsx` ให้ใช้ shared layout/styles
- สร้าง `tests/components/email-shared.test.tsx` เพื่อ lock shared style values, layout preview/children, verification/reset links, notification copy และ receipt content
- ไม่เปลี่ยน production behavior, subject/content/copy, link behavior, formatting, email preview output หรือ props contract
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

ผล test:

- focused email tests: ผ่าน 3 files / 50 tests
- `npm test`: ผ่าน 116 files / 1412 tests, skipped 6
- `npm run lint`: ผ่าน

### Step 10.2: Email cleanup and final audit

สถานะล่าสุด: เสร็จแล้ว 2026-05-08

เป้าหมาย:

- cleanup `components/emails/*` และ `tests/components/email-shared.test.tsx` หลังแยก `EmailLayout` และ `emailStyles` ใน Step 10.1
- ปรับเฉพาะ import/flow/readability/test naming ที่ไม่เปลี่ยน production behavior
- สรุปว่า email shared layout/style phase นี้ปิดได้หรือยัง

ไฟล์ที่จะสร้าง:

- ไม่มี

ไฟล์ที่จะแก้ในรอบนี้:

- `components/emails/EmailLayout.tsx`
- `components/emails/emailStyles.ts`
- `tests/components/email-shared.test.tsx`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ไม่เปลี่ยน production behavior, subject/content/copy, link behavior, formatting, email preview output, props contract หรือ style values
- ไม่แยก layout/style เพิ่มถ้าไม่จำเป็น
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped refactor และยืนยันด้วย focused/full tests แทน

test หลังทำ:

- focused email tests
- `npm test`
- `npm run lint`

ผลลัพธ์หลังทำ:

- cleanup `components/emails/emailStyles.ts` โดยเพิ่ม `EmailStyle` type alias จาก `CSSProperties` และ annotate shared style constants ให้สัญญา style ชัดขึ้น
- cleanup `components/emails/EmailLayout.tsx` ให้ `bodyStyle` และ `containerStyle` ใช้ `EmailStyle` แทน `Record<string, unknown>`
- cleanup `tests/components/email-shared.test.tsx` โดยปรับชื่อ describe ให้ตรงกับ `components/emails` shared layout/styles
- ไม่แยก layout/style เพิ่ม และไม่เปลี่ยน production behavior, subject/content/copy, link behavior, formatting, email preview output, props contract หรือ style values
- email shared layout/style phase ปิดได้: email templates ใช้ `EmailLayout` และ shared style constants แล้ว ส่วน template-specific content/receipt rows/formatting ยังอยู่ในไฟล์เดิมเพื่อรักษา output
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

ผล test:

- focused email tests: ผ่าน 3 files / 50 tests
- `npm test`: ผ่าน 116 files / 1412 tests, skipped 6
- `npm run lint`: ผ่าน

### Step 11.1: Upload client helper

สถานะล่าสุด: เสร็จแล้ว 2026-05-08

เป้าหมาย:

- ตรวจจุดที่เรียก `API_ROUTES.UPLOAD` / `/api/upload` ใน admin/news, popup, settings และ product image gallery
- สร้าง shared client helper สำหรับ upload request/response parsing เฉพาะส่วนที่ปลอดภัย
- ให้ caller เดิมยังเป็นคนตัดสิน success/error, copy, preview และ UI flow เหมือนเดิม

ไฟล์ที่จะสร้าง:

- `lib/client/uploadClient.ts`
- `tests/lib/uploadClient.test.ts`

ไฟล์ที่จะแก้ในรอบนี้:

- `app/admin/news/page.tsx`
- `app/admin/popups/page.tsx`
- `app/admin/settings/page.tsx`
- `components/admin/ProductImageGalleryField.tsx`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ไม่เปลี่ยน production behavior, upload endpoint, FormData field, response handling, error copy, image preview behavior หรือ UI flow
- ถ้า response แต่ละหน้าใช้ต่างกัน ให้แยกเฉพาะ typed fetch/helper ที่รักษา contract เดิม
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped refactor และยืนยันด้วย focused/full tests แทน

test หลังทำ:

- focused upload/client tests: ผ่าน 1 file / 4 tests
- `npm test`: ผ่าน 117 files / 1416 tests, skipped 6
- `npm run lint`: ผ่าน

ผลลัพธ์หลังทำ:

- สร้าง `lib/client/uploadClient.ts` เพื่อรวมการสร้าง `FormData`, เรียก `API_ROUTES.UPLOAD` และ parse JSON response
- ปรับ `app/admin/news/page.tsx`, `app/admin/popups/page.tsx`, `app/admin/settings/page.tsx` และ `components/admin/ProductImageGalleryField.tsx` ให้ใช้ `uploadFileToApi`
- ยังให้แต่ละ caller จัดการ compression, success/error, copy, preview และ UI flow เองเหมือนเดิม
- เพิ่ม `tests/lib/uploadClient.test.ts` สำหรับ default field `file`, endpoint `/api/upload`, custom contract และ response parsing
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 11.2: Upload client cleanup and final audit

สถานะล่าสุด: เสร็จแล้ว 2026-05-08

เป้าหมาย:

- cleanup upload client helper และ callers หลัง Step 11.1 เฉพาะเรื่อง import/flow/readability/test naming
- ตรวจว่าไม่มี direct `/api/upload` / `API_ROUTES.UPLOAD` fetch ค้างใน admin/news, popups, settings และ product image gallery
- ปิดรอบ upload client phase โดยไม่ย้าย logic เพิ่มถ้าไม่จำเป็น

ไฟล์ที่จะสร้าง:

- ไม่มี

ไฟล์ที่จะแก้ในรอบนี้:

- `app/admin/news/page.tsx`
- `app/admin/popups/page.tsx`
- `app/admin/settings/page.tsx`
- `components/admin/ProductImageGalleryField.tsx`
- `lib/client/uploadClient.ts`
- `tests/lib/uploadClient.test.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ไม่เปลี่ยน production behavior, upload endpoint, FormData fields, response handling, error copy, image preview behavior หรือ UI flow
- ไม่ย้าย logic เพิ่มถ้าไม่จำเป็น
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped refactor และยืนยันด้วย focused/full tests แทน

test หลังทำ:

- focused upload/client tests: ผ่าน 1 file / 4 tests
- `npm test`: ผ่าน 117 files / 1416 tests, skipped 6
- `npm run lint`: ผ่าน

ผลลัพธ์หลังทำ:

- cleanup `lib/client/uploadClient.ts` โดยเพิ่ม default field constant, แยกชื่อ type ของ fetcher/target ให้อ่านง่ายขึ้น และใส่ return type ให้ `uploadFileToApi`
- cleanup `tests/lib/uploadClient.test.ts` โดยเปลี่ยน describe ให้ชี้ path helper ชัดขึ้น และลด repeated `FormData` cast ใน assertions
- cleanup import readability ใน `app/admin/settings/page.tsx` และ `components/admin/ProductImageGalleryField.tsx`
- ตรวจแล้วไม่มี direct `API_ROUTES.UPLOAD` / `/api/upload` fetch ค้างใน admin/news, popups, settings และ product image gallery
- ไม่ย้าย logic เพิ่ม และไม่เปลี่ยน production behavior, upload endpoint, FormData fields, response handling, error copy, image preview behavior หรือ UI flow
- upload client phase ปิดได้: callers ใช้ `uploadFileToApi` แล้ว ส่วน validation/compression/UI feedback ยังอยู่กับ caller เพื่อรักษา behavior เดิม
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 12.1: Admin gacha rewards client helper

สถานะล่าสุด: เสร็จแล้ว 2026-05-08

เป้าหมาย:

- ตรวจจุดที่เรียก `/api/admin/gacha-rewards` และ `/api/admin/gacha-rewards/upload-image` ในหน้า admin gacha rewards
- สร้าง shared client helper สำหรับ request/response parsing เฉพาะส่วนที่ปลอดภัย
- ให้ caller เดิมยังเป็นคนตัดสิน success/error, copy, image preview และ UI flow เหมือนเดิม

ไฟล์ที่จะสร้าง:

- `lib/client/adminGachaRewardsClient.ts`
- `tests/lib/adminGachaRewardsClient.test.ts`

ไฟล์ที่จะแก้ในรอบนี้:

- `app/admin/gacha-grid/page.tsx`
- `app/admin/gacha-machines/[id]/edit/page.tsx`
- `app/admin/gacha-settings/page.tsx`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ไม่เปลี่ยน production behavior, endpoint, FormData fields, response handling, error copy, image preview behavior หรือ UI flow
- ถ้า response แต่ละหน้าใช้ต่างกัน ให้แยกเฉพาะ typed fetch/helper ที่รักษา contract เดิม
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped refactor และยืนยันด้วย focused/full tests แทน

test หลังทำ:

- focused admin gacha rewards client tests: ผ่าน 1 file / 6 tests
- `npm test`: ผ่าน 118 files / 1422 tests, skipped 6
- `npm run lint`: ผ่าน

ผลลัพธ์หลังทำ:

- สร้าง `lib/client/adminGachaRewardsClient.ts` เพื่อรวม request/response parsing ของ admin gacha rewards list/create/update/delete และ reward image upload
- ปรับ `app/admin/gacha-grid/page.tsx`, `app/admin/gacha-machines/[id]/edit/page.tsx` และ `app/admin/gacha-settings/page.tsx` ให้ใช้ shared helper แทน direct `/api/admin/gacha-rewards` และ `/api/admin/gacha-rewards/upload-image`
- ยังให้แต่ละ caller จัดการ success/error, copy, image preview, crop/resize/compress และ UI flow เองเหมือนเดิม
- เพิ่ม `tests/lib/adminGachaRewardsClient.test.ts` สำหรับ endpoint, query string, JSON body, detail endpoint, delete method, upload `file` field และ response parsing
- ตรวจแล้วไม่มี direct `/api/admin/gacha-rewards` หรือ `new FormData` สำหรับ reward upload ค้างใน 3 หน้า admin gacha ที่แก้
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 12.2: Admin gacha rewards client cleanup and final audit

สถานะล่าสุด: เสร็จแล้ว 2026-05-08

เป้าหมาย:

- cleanup admin gacha rewards client helper และ callers หลัง Step 12.1 เฉพาะเรื่อง import/flow/readability/test naming
- ตรวจซ้ำว่าไม่มี direct `/api/admin/gacha-rewards` และ `/api/admin/gacha-rewards/upload-image` fetch ค้างในหน้า admin gacha rewards
- ปิดรอบ admin gacha rewards client phase โดยไม่ย้าย logic เพิ่มถ้าไม่จำเป็น

ไฟล์ที่จะสร้าง:

- ไม่มี

ไฟล์ที่จะแก้ในรอบนี้:

- `app/admin/gacha-grid/page.tsx`
- `app/admin/gacha-machines/[id]/edit/page.tsx`
- `app/admin/gacha-settings/page.tsx`
- `lib/client/adminGachaRewardsClient.ts`
- `tests/lib/adminGachaRewardsClient.test.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ไม่เปลี่ยน production behavior, endpoint, FormData fields, response handling, error copy, image preview behavior หรือ UI flow
- ไม่ย้าย logic เพิ่มถ้าไม่จำเป็น
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped refactor และยืนยันด้วย focused/full tests แทน

test หลังทำ:

- focused admin gacha rewards client tests: ผ่าน 1 file / 6 tests
- `npm test`: ผ่าน 118 files / 1422 tests, skipped 6
- `npm run lint`: ผ่าน

ผลลัพธ์หลังทำ:

- cleanup `lib/client/adminGachaRewardsClient.ts` โดยเพิ่ม `REQUEST_METHODS` constant และใส่ return type ให้ helper public ทั้ง list/create/update/delete/upload image
- cleanup `tests/lib/adminGachaRewardsClient.test.ts` โดยแยก `getSentFormData` เพื่อลด repeated cast ใน assertion
- cleanup import readability ใน `app/admin/gacha-grid/page.tsx`, `app/admin/gacha-machines/[id]/edit/page.tsx` และ `app/admin/gacha-settings/page.tsx`
- ตรวจซ้ำแล้วไม่มี direct `/api/admin/gacha-rewards` หรือ `new FormData` สำหรับ reward upload ค้างใน 3 หน้า admin gacha ที่แก้
- ไม่ย้าย logic เพิ่ม และไม่เปลี่ยน production behavior, endpoint, FormData fields, response handling, error copy, image preview behavior หรือ UI flow
- admin gacha rewards client phase ปิดได้: callers ใช้ shared helper แล้ว ส่วน crop/resize/compress/UI feedback ยังอยู่กับ caller เพื่อรักษา behavior เดิม
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 13.1: API response and validation helper audit

สถานะล่าสุด: เสร็จแล้ว 2026-05-08

เป้าหมาย:

- audit `lib/api.ts`, `lib/apiSecurity.ts`, `lib/validations/validate.ts` และ route ที่ใช้ helper เหล่านี้
- ระบุว่า helper ไหนซ้ำกัน, response shape ไหนต่างกัน และ route ไหนเป็น candidate ปลอดภัยสำหรับ refactor รอบถัดไป
- ทำ cleanup เฉพาะจุดเล็ก ๆ เฉพาะเมื่อปลอดภัยมากและไม่เปลี่ยน response shape

ไฟล์ที่จะตรวจ:

- `lib/api.ts`
- `lib/apiSecurity.ts`
- `lib/validations/validate.ts`
- route ที่ import `parseBody` จาก `@/lib/api`
- route ที่ import `validateBody` จาก `@/lib/validations/validate`
- tests ที่ครอบคลุม `lib/api`, `lib/apiSecurity` และ `lib/validations/validate`

ไฟล์ที่จะสร้าง:

- ไม่มี

ไฟล์ที่จะแก้ในรอบนี้:

- `docs/planning/shared-layer-audit.md`
- อาจแก้ `lib/api.ts`, `lib/apiSecurity.ts`, `lib/validations/validate.ts` หรือ tests เฉพาะถ้าพบ cleanup ที่ปลอดภัยมากและไม่เปลี่ยน behavior

ข้อจำกัดของรอบนี้:

- ห้ามเปลี่ยน production response shape, status code, auth behavior, validation message หรือ client contract
- ไม่ migrate route ใด ๆ ใน Step นี้ถ้ายังไม่ได้แยก candidate และ test guard ชัดเจน
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped audit และยืนยันด้วย focused/full tests แทน

test หลังทำ:

- focused API helper tests: ผ่าน 5 files / 91 tests
- `npm test`: ผ่าน 118 files / 1422 tests, skipped 6
- `npm run lint`: ผ่าน

ผล audit:

- `lib/api.ts` เป็น helper แกนกลางสำหรับ payload และ JSON/Zod parsing:
  - `apiSuccess(data, message?, status?)` คืน `{ success: true, data, message? }`
  - `apiError(message, status?, errors?)` คืน `{ success: false, message, errors? }`
  - `parseBody` ใช้ invalid JSON message `"Invalid JSON body"`, validation status `422`, validation message `"ข้อมูลไม่ถูกต้อง"` และ `errors` แบบ full path
- `lib/apiSecurity.ts` ใช้ payload builder จาก `lib/api.ts` แต่เป็น response contract อีกชุด:
  - success ใส่ default message `"Success"` และ `timestamp`
  - error ใส่ `errorCode` default เช่น `ERR_400` และ `timestamp`
  - มี preset `API_ERRORS.*`, `handleApiError`, `parseRequestBody`, `validateRequestBody`
  - ตอนนี้ไม่พบ route ใต้ `app/api` import `@/lib/apiSecurity` โดยตรง แต่มี tests ครอบคลุมอยู่
- `lib/validations/validate.ts` เป็น wrapper ของ `validateJsonBody` สำหรับ admin/content/gacha routes:
  - invalid JSON message `"Request body ไม่ถูกต้อง (invalid JSON)"`
  - validation status `400`
  - validation message ใช้ first Zod issue
  - errors ใช้ first path เท่านั้น
- route usage ปัจจุบัน:
  - `parseBody` จาก `@/lib/api`: 3 routes (`auth/forgot-password`, `auth/reset-password`, `register`)
  - `validateBody` จาก `@/lib/validations/validate`: 22 admin routes
  - `apiSecurity`: ไม่พบ direct route import ใต้ `app/api`
- response shape ยังไม่ควรรวมทันที:
  - content/settings routes หลายตัวคืน raw object/array หรือ `{ error }`
  - gacha routes หลายตัวคืน `{ success, data, message? }`
  - auth/register/reset routes มี client contract เฉพาะ เช่น `{ success, message }` และบาง GET คืน `{ valid }`

candidate สำหรับ Step ถัดไป:

- Step 13.2 ควรทำเป็น API response contract notes + test guard ก่อน ไม่ migrate route ทันที
- candidate ที่ปลอดภัยกว่ากลุ่มอื่นคือ route ที่ใช้ `{ success, data, message? }` อยู่แล้ว เช่น `admin/gacha-machines`, `admin/gacha-rewards`, `admin/gacha-settings`
- route ที่ยังไม่ควร migrate รอบแรกคือ content/settings routes ที่ client อาจคาด raw object/array หรือ `{ error }`
- ถ้าจะรวม helper จริง ให้เริ่มจากเพิ่ม named wrapper ใหม่ที่ preserve contract เดิม 100% และเพิ่ม tests ก่อนแตะ route

ผลลัพธ์หลังทำ:

- บันทึก audit และ candidate ลง `docs/planning/shared-layer-audit.md`
- ไม่แก้ production code เพราะยังไม่มี cleanup ที่ปลอดภัยพอโดยไม่เสี่ยงเปลี่ยน response shape/status/message/client contract
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 13.2: API response contract notes and test guards

สถานะล่าสุด: เสร็จแล้ว 2026-05-08

เป้าหมาย:

- เพิ่ม notes สรุป response contract ปัจจุบันของ API helper และ route groups ที่สำคัญ
- เพิ่ม/ปรับ test guard เฉพาะ helper contract ที่มีอยู่แล้ว
- ไม่แก้ production response shape หรือ migrate route ในรอบนี้

ไฟล์ที่จะสร้าง:

- ไม่มี

ไฟล์ที่จะแก้ในรอบนี้:

- `docs/planning/shared-layer-audit.md`
- `tests/lib/api.test.ts`
- `tests/lib/apiSecurity.test.ts`
- `tests/lib/validateBody.test.ts`

ข้อจำกัดของรอบนี้:

- ห้ามเปลี่ยน production response shape, status code, auth behavior, validation message หรือ client contract
- ถ้าไม่จำเป็น ไม่ต้องแก้ production code
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped audit/test guard แทน

test หลังทำ:

- focused API helper tests: ผ่าน 5 files / 93 tests
- `npm test`: ผ่าน 118 files / 1424 tests, skipped 6
- `npm run lint`: ผ่าน

contract notes ที่ต้องรักษา:

- `lib/api.ts`
  - `apiSuccess` contract ปัจจุบัน: `{ success: true, data, message? }`
  - `apiError` contract ปัจจุบัน: `{ success: false, message, errors? }`
  - `parseBody` invalid JSON: status `400`, message `"Invalid JSON body"`
  - `parseBody` validation failure: status `422`, message `"ข้อมูลไม่ถูกต้อง"`, `errors` ใช้ full path
  - payload builder สามารถสร้าง `timestamp` / `errorCode` ได้ แต่ `apiSuccess` และ `apiError` default ไม่ใส่ fields เหล่านี้
- `lib/apiSecurity.ts`
  - success contract: `{ success: true, data, message, timestamp }` โดย default message คือ `"Success"`
  - error contract: `{ success: false, message, errorCode, timestamp }`
  - presets `API_ERRORS.*` เป็น contract ที่มี status/message/errorCode เฉพาะตัว
  - `parseRequestBody` invalid JSON ต้องคืน `API_ERRORS.BAD_REQUEST("Invalid JSON body")`
- `lib/validations/validate.ts`
  - valid body คืน `{ data }`
  - invalid JSON: status `400`, body `{ success: false, message: "Request body ไม่ถูกต้อง (invalid JSON)" }`
  - validation failure: status `400`, message ใช้ Zod issue แรก, `errors` group ตาม first path
- route กลุ่ม auth/register/reset
  - ใช้ `parseBody` จาก `lib/api.ts`
  - client contract มี response เฉพาะ flow เช่น `{ success, message }`, rate-limit status `429`, Turnstile status `400`, และ reset token GET คืน `{ valid, message? }`
  - ยังไม่ควรเปลี่ยน response helper ในกลุ่มนี้ก่อนมี route-specific test guard
- route กลุ่ม admin gacha
  - ใช้ `{ success, data, message? }` เป็น pattern หลัก
  - เป็น candidate ที่เหมาะกับ wrapper ใหม่แบบ preserve contract ใน step ถัดไป
- route กลุ่ม content/settings
  - หลาย route ยังคืน raw object/array หรือ `{ error }`
  - ยังไม่ควร migrate เป็น `{ success, data }` เพราะ client อาจคาด response shape เดิมอยู่

ผลลัพธ์หลังทำ:

- เพิ่ม contract notes ใน `docs/planning/shared-layer-audit.md` สำหรับ `lib/api.ts`, `lib/apiSecurity.ts`, `lib/validations/validate.ts`, auth/register/reset routes, admin gacha routes และ content/settings routes
- เพิ่ม test guard ใน `tests/lib/api.test.ts` เพื่อยืนยันว่า `apiSuccess`/`apiError` default ไม่ใส่ `timestamp`/`errorCode` และ payload builder ยังรองรับ contract ของ `apiSecurity`
- เพิ่ม test guard ใน `tests/lib/apiSecurity.test.ts` เพื่อยืนยัน default success message, timestamp, default errorCode และ invalid JSON/missing required fields contract
- เพิ่ม test guard ใน `tests/lib/validateBody.test.ts` เพื่อยืนยัน invalid JSON message/status และ Zod validation message/errors แบบ first-path
- ไม่แก้ production code เพิ่มใน Step 13.2 และไม่ migrate route ใด ๆ
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 13.3: API success response wrapper for gacha routes

สถานะล่าสุด: เสร็จแล้ว 2026-05-08

เป้าหมาย:

- สร้าง helper/wrapper สำหรับ admin gacha response ที่ preserve contract เดิม `{ success, data, message? }`
- เริ่มใช้กับ route ที่ปลอดภัยมากก่อน โดยเลือก `app/api/admin/gacha-settings/route.ts`
- เพิ่ม test guard สำหรับ helper และ route contract โดยไม่เปลี่ยน response shape/status/message/client contract

ไฟล์ที่จะสร้าง:

- `lib/features/gacha/apiResponse.ts`
- `tests/lib/gachaApiResponse.test.ts`

ไฟล์ที่จะแก้ในรอบนี้:

- `app/api/admin/gacha-settings/route.ts`
- `tests/api/admin-gacha-content.test.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ห้ามเปลี่ยน production response shape, status code, auth behavior, validation message หรือ client contract
- ถ้า helper ยังไม่ครอบคลุม route อื่น ห้าม migrate route อื่นเพิ่มในรอบนี้
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped refactor และยืนยันด้วย focused/full tests แทน

test หลังทำ:

- focused API/gacha response tests: ผ่าน 3 files / 88 tests
- `npm test`: ผ่าน 119 files / 1428 tests, skipped 6
- `npm run lint`: ผ่าน

ผลลัพธ์หลังทำ:

- สร้าง `lib/features/gacha/apiResponse.ts` สำหรับ `gachaApiSuccess` และ `gachaApiError` ที่ preserve admin gacha response contract เดิม
- ปรับ `app/api/admin/gacha-settings/route.ts` ให้ใช้ wrapper ใหม่เฉพาะ response boundary โดยไม่เปลี่ยน auth, validation, DB flow, response body หรือ status code
- เพิ่ม `tests/lib/gachaApiResponse.test.ts` เพื่อ lock success body, success+message body, error body/status และ `{ success: false }` แบบไม่มี message
- เพิ่ม route contract guard ใน `tests/api/admin-gacha-content.test.ts` สำหรับ `GET 401`, `GET success` และ `PUT success message/data` ของ `admin/gacha-settings`
- ยังไม่ migrate `admin/gacha-machines` หรือ `admin/gacha-rewards` ในรอบนี้ เพื่อให้ blast radius เล็กและมี guard ชัดก่อน
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 13.4: Apply gacha API response wrapper to gacha machines route

สถานะล่าสุด: เสร็จแล้ว 2026-05-08

เป้าหมาย:

- ใช้ `gachaApiSuccess` / `gachaApiError` กับ `app/api/admin/gacha-machines/route.ts`
- preserve response body/status เดิม 100% สำหรับ GET/POST success และ unauthorized
- เพิ่ม route contract guard สำหรับ `gacha-machines`

ไฟล์ที่จะสร้าง:

- ไม่มี

ไฟล์ที่จะแก้ในรอบนี้:

- `app/api/admin/gacha-machines/route.ts`
- `tests/api/admin-gacha-content.test.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ห้ามเปลี่ยน production response shape, status code, auth behavior, validation message, DB flow หรือ client contract
- ไม่ migrate `admin/gacha-rewards` หรือ route อื่นในรอบนี้
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped refactor และยืนยันด้วย focused/full tests แทน

test หลังทำ:

- focused API/gacha response tests: ผ่าน 4 files / 103 tests
- `npm test`: ผ่าน 119 files / 1428 tests, skipped 6
- `npm run lint`: ผ่าน

ผลลัพธ์หลังทำ:

- ปรับ `app/api/admin/gacha-machines/route.ts` ให้ใช้ `gachaApiSuccess` / `gachaApiError` เฉพาะ response boundary
- preserve response เดิมของ `gacha-machines`: unauthorized ยังเป็น `{ success: false }` status `401`, success ยังเป็น `{ success: true, data }` status `200`
- เพิ่ม route contract guard ใน `tests/api/admin-gacha-content.test.ts` สำหรับ `GET 401`, `GET success`, `POST 401` และ `POST success` ของ `admin/gacha-machines`
- ไม่เปลี่ยน auth behavior, validation message, DB flow, probability summary mapping, normalized cost logic หรือ client contract
- ยังไม่ migrate `admin/gacha-rewards` หรือ route อื่นในรอบนี้
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 13.5: Apply gacha API response wrapper to gacha rewards main route

สถานะล่าสุด: เสร็จแล้ว 2026-05-08

เป้าหมาย:

- ใช้ `gachaApiSuccess` / `gachaApiError` กับ `app/api/admin/gacha-rewards/route.ts`
- preserve response body/status เดิม 100% สำหรับ `GET` / `POST` success, unauthorized, validation guard และ catch error
- เพิ่ม route contract guard สำหรับ `gacha-rewards` main route

ไฟล์ที่จะสร้าง:

- ไม่มี

ไฟล์ที่จะแก้ในรอบนี้:

- `app/api/admin/gacha-rewards/route.ts`
- `tests/api/zero-coverage-routes.test.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ห้ามเปลี่ยน production response shape, status code, auth behavior, validation message, DB flow, probability recalculation หรือ client contract
- ยังไม่แตะ `app/api/admin/gacha-rewards/[id]/route.ts` หรือ `app/api/admin/gacha-rewards/upload-image/route.ts`
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped refactor และยืนยันด้วย focused/full tests แทน

test หลังทำ:

- focused API/gacha response tests: ผ่าน 4 files / 83 tests
- `npm test`: ผ่าน 119 files / 1428 tests, skipped 6
- `npm run lint`: ผ่าน

ผลลัพธ์หลังทำ:

- ปรับ `app/api/admin/gacha-rewards/route.ts` ให้ใช้ `gachaApiSuccess` / `gachaApiError` เฉพาะ response boundary ของ main route
- preserve response เดิมของ `gacha-rewards`: unauthorized ยังเป็น `{ success: false, message }` status `401`, success ยังเป็น `{ success: true, data }` status `200`, validation guard ยังคืน message/status เดิม และ catch error ยังคืน status `500`
- เพิ่ม route contract guard ใน `tests/api/zero-coverage-routes.test.ts` สำหรับ `GET 401`, `GET success`, `GET empty filter`, `GET product mapping`, `POST 401`, `POST success` และ validation guard ของ `admin/gacha-rewards`
- ไม่เปลี่ยน auth behavior, validation message, DB flow, reward mapping, probability recalculation หรือ client contract
- ยังไม่แตะ `app/api/admin/gacha-rewards/[id]/route.ts` หรือ `app/api/admin/gacha-rewards/upload-image/route.ts`
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 13.6: Gacha rewards detail route contract audit and safe wrapper use

สถานะล่าสุด: เสร็จแล้ว 2026-05-08

เป้าหมาย:

- ตรวจ `app/api/admin/gacha-rewards/[id]/route.ts`
- ใช้ `gachaApiSuccess` / `gachaApiError` เฉพาะ response ที่ preserve response body/status เดิมได้ 100%
- เพิ่ม route contract guard สำหรับ `PUT` / `DELETE` ของ `gacha-rewards/[id]`

ไฟล์ที่จะสร้าง:

- ไม่มี

ไฟล์ที่จะแก้ในรอบนี้:

- `app/api/admin/gacha-rewards/[id]/route.ts`
- `tests/api/new-code-uncovered.test.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ห้ามเปลี่ยน production response shape, status code, auth behavior, validation message, DB flow, probability recalculation หรือ client contract
- `DELETE` success เดิมคืน `{ success: true }` ไม่มี `data` จึงยังไม่ใช้ `gachaApiSuccess` กับ response นี้
- ยังไม่แตะ `app/api/admin/gacha-rewards/upload-image/route.ts` หรือ route อื่นในรอบนี้
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped refactor และยืนยันด้วย focused/full tests แทน

test หลังทำ:

- focused API/gacha response tests: ผ่าน 5 files / 123 tests
- `npm test`: ผ่าน 119 files / 1428 tests, skipped 6
- `npm run lint`: ผ่าน

ผลลัพธ์หลังทำ:

- ปรับ `app/api/admin/gacha-rewards/[id]/route.ts` ให้ใช้ `gachaApiError` กับ unauthorized/catch error ของ `PUT` และ `DELETE`
- ปรับ `PUT` success ให้ใช้ `gachaApiSuccess(updated)` เพราะ response เดิมคือ `{ success: true, data }` status `200`
- คง `DELETE` success เป็น `NextResponse.json({ success: true })` เพราะ helper เดิมจะเพิ่ม `data` และทำให้ response shape เปลี่ยน
- เพิ่ม route contract guard ใน `tests/api/new-code-uncovered.test.ts` สำหรับ `PUT 401`, `PUT success`, `PUT partial success`, `DELETE 401` และ `DELETE success`
- ไม่เปลี่ยน auth behavior, validation message, DB flow, probability recalculation หรือ client contract
- ยังไม่แตะ `app/api/admin/gacha-rewards/upload-image/route.ts` หรือ route อื่นในรอบนี้
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 13.7: Gacha machines detail route contract audit and safe wrapper use

สถานะล่าสุด: เสร็จแล้ว 2026-05-08

เป้าหมาย:

- ตรวจ `app/api/admin/gacha-machines/[id]/route.ts`
- ใช้ `gachaApiSuccess` / `gachaApiError` เฉพาะ response ที่ preserve response body/status เดิมได้ 100%
- เพิ่ม route contract guard สำหรับ `GET` / `PATCH` / `DELETE` ของ `gacha-machines/[id]`

ไฟล์ที่จะสร้าง:

- ไม่มี

ไฟล์ที่จะแก้ในรอบนี้:

- `app/api/admin/gacha-machines/[id]/route.ts`
- `tests/api/new-code-routes.test.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ห้ามเปลี่ยน production response shape, status code, auth behavior, validation message, DB flow หรือ client contract
- `PATCH` คือ method จริงของ route นี้ แม้คำสั่งพูดถึง `PUT`
- unauthorized เดิมคืน `{ success: false }` ไม่มี `message` จึงต้องใช้ `gachaApiError(undefined, { status: 401 })`
- `DELETE` success เดิมคืน `{ success: true }` ไม่มี `data` จึงยังไม่ใช้ `gachaApiSuccess` กับ response นี้
- ยังไม่แตะ `upload-image`, `reorder`, `duplicate` หรือ route อื่นในรอบนี้
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped refactor และยืนยันด้วย focused/full tests แทน

test หลังทำ:

- focused API/gacha response tests: ผ่าน 4 files / 69 tests
- `npm test`: ผ่าน 119 files / 1428 tests, skipped 6
- `npm run lint`: ผ่าน

ผลลัพธ์หลังทำ:

- ปรับ `app/api/admin/gacha-machines/[id]/route.ts` ให้ใช้ `gachaApiError` กับ unauthorized ของ `GET` / `PATCH` / `DELETE` โดยยัง preserve `{ success: false }` ไม่มี `message`
- ปรับ `GET` not found และ `PATCH` probability guard ให้ใช้ `gachaApiError(message, { status })` โดย message/status เดิม
- ปรับ `GET` success และ `PATCH` success ให้ใช้ `gachaApiSuccess(...)` เพราะ response เดิมคือ `{ success: true, data }` status `200`
- คง `DELETE` success เป็น `NextResponse.json({ success: true })` เพราะ helper เดิมจะเพิ่ม `data` และทำให้ response shape เปลี่ยน
- เพิ่ม route contract guard ใน `tests/api/new-code-routes.test.ts` สำหรับ `GET 401`, `GET 404`, `GET success`, `PATCH 401`, `PATCH success`, `DELETE 401` และ `DELETE success`
- ไม่เปลี่ยน auth behavior, validation message, DB flow, cost normalization, probability validation หรือ client contract
- ยังไม่แตะ `upload-image`, `reorder`, `duplicate` หรือ route อื่นในรอบนี้
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 13.8: Gacha machines duplicate route contract audit and safe wrapper use

สถานะล่าสุด: เสร็จแล้ว 2026-05-08

เป้าหมาย:

- ตรวจ `app/api/admin/gacha-machines/[id]/duplicate/route.ts`
- ใช้ `gachaApiSuccess` / `gachaApiError` เฉพาะ response ที่ preserve response body/status เดิมได้ 100%
- เพิ่ม route contract guard สำหรับ duplicate route

ไฟล์ที่จะสร้าง:

- ไม่มี

ไฟล์ที่จะแก้ในรอบนี้:

- `app/api/admin/gacha-machines/[id]/duplicate/route.ts`
- `tests/api/coverage-boost-2.test.ts`
- `tests/api/final-coverage-patch.test.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ห้ามเปลี่ยน production response shape, status code, auth behavior, DB flow, duplicate machine/reward logic, cost normalization หรือ client contract
- unauthorized เดิมคืน `{ success: false }` ไม่มี `message` จึงต้องใช้ `gachaApiError(undefined, { status: 401 })`
- ยังไม่แตะ `upload-image`, `reorder` หรือ route อื่นในรอบนี้
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped refactor และยืนยันด้วย focused/full tests แทน

test หลังทำ:

- focused API/gacha response tests: ผ่าน 6 files / 113 tests
- `npm test`: ผ่าน 119 files / 1428 tests, skipped 6
- `npm run lint`: ผ่าน

ผลลัพธ์หลังทำ:

- ปรับ `app/api/admin/gacha-machines/[id]/duplicate/route.ts` ให้ใช้ `gachaApiError` กับ unauthorized, not found และ catch error
- ปรับ success response ให้ใช้ `gachaApiSuccess({ id: newId })` เพราะ response เดิมคือ `{ success: true, data: { id } }` status `200`
- ไม่เปลี่ยน duplicate machine/reward logic, generated IDs, cost normalization, insert order, auth behavior หรือ client contract
- เพิ่ม route contract guard ใน `tests/api/coverage-boost-2.test.ts` สำหรับ `401`, `404`, success with rewards และ success without rewards
- เพิ่ม catch error contract guard ใน `tests/api/final-coverage-patch.test.ts`
- ยังไม่แตะ `upload-image`, `reorder` หรือ route อื่นในรอบนี้
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 13.9: Gacha machines reorder route contract audit and safe wrapper use

สถานะล่าสุด: เสร็จแล้ว 2026-05-13

เป้าหมาย:

- ตรวจ `app/api/admin/gacha-machines/reorder/route.ts`
- ใช้ `gachaApiError` เฉพาะ response ที่ preserve response body/status เดิมได้ 100%
- เพิ่ม route contract guard สำหรับ reorder route

ไฟล์ที่จะสร้าง:

- ไม่มี

ไฟล์ที่จะแก้ในรอบนี้:

- `app/api/admin/gacha-machines/reorder/route.ts`
- `tests/api/new-code-routes.test.ts`
- `tests/api/final-coverage-patch-4.test.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ห้ามเปลี่ยน production response shape, status code, auth behavior, request payload, DB flow, reorder logic หรือ client contract
- unauthorized เดิมคืน `{ success: false }` ไม่มี `message` จึงต้องใช้ `gachaApiError(undefined, { status: 401 })`
- success เดิมคืน `{ success: true }` ไม่มี `data` จึงยังไม่ใช้ `gachaApiSuccess` กับ response นี้
- ยังไม่แตะ `upload-image` หรือ route อื่นในรอบนี้
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped refactor และยืนยันด้วย focused/full tests แทน

test หลังทำ:

- focused API/gacha response tests: ผ่าน 3 files / 40 tests
- `npm test`: ผ่าน 119 files / 1428 tests, skipped 6
- `npm run lint`: ผ่าน

ผลลัพธ์หลังทำ:

- ปรับ `app/api/admin/gacha-machines/reorder/route.ts` ให้ใช้ `gachaApiError` กับ unauthorized, invalid payload และ catch error
- คง success response เป็น `NextResponse.json({ success: true })` เพราะ helper เดิมจะเพิ่ม `data` และทำให้ response shape เปลี่ยน
- ไม่เปลี่ยน request payload, DB flow, reorder logic, auth behavior หรือ client contract
- เพิ่ม route contract guard ใน `tests/api/new-code-routes.test.ts` สำหรับ `401` และ success `{ success: true }`
- เพิ่ม route contract guard ใน `tests/api/final-coverage-patch-4.test.ts` สำหรับ `400 Invalid payload` และ `500 Unknown error`
- ยังไม่แตะ `upload-image` หรือ route อื่นในรอบนี้
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 13.10: Gacha upload-image response contract audit

สถานะล่าสุด: เสร็จแล้ว 2026-05-13

เป้าหมาย:

- ตรวจ `app/api/admin/gacha-machines/upload-image/route.ts`
- ตรวจ `app/api/admin/gacha-rewards/upload-image/route.ts`
- ตรวจ client/helper และ tests ที่พึ่งพา response `{ success, url, filename }`
- เพิ่ม contract guard โดยไม่เปลี่ยน production response shape

ไฟล์ที่จะสร้าง:

- `tests/api/admin-gacha-upload-image.test.ts`

ไฟล์ที่จะแก้ในรอบนี้:

- `lib/client/adminGachaRewardsClient.ts`
- `tests/lib/adminGachaRewardsClient.test.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ห้ามเปลี่ยน production response shape, status code, auth behavior, upload options, FormData field, saved filename/url behavior หรือ client contract
- success เดิมของ upload-image คืน `{ success: true, url, filename }` ไม่มี `data` จึงยังไม่ใช้ `gachaApiSuccess` กับ response นี้
- ถ้าจะรวม helper ภายหลังควรเป็น helper เฉพาะ upload เช่น `gachaApiUploadSuccess` ที่ preserve shape เดิม 100%
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped audit และยืนยันด้วย focused/full tests แทน

test หลังทำ:

- focused API/gacha upload tests: ผ่าน 2 files / 11 tests
- `npm test`: ผ่าน 120 files / 1433 tests, skipped 6
- `npm run lint`: ผ่าน

ผล audit:

- `app/api/admin/gacha-machines/upload-image/route.ts` และ `app/api/admin/gacha-rewards/upload-image/route.ts` มี success contract เฉพาะ `{ success: true, url, filename }`
- `gachaApiSuccess` ยังไม่เหมาะกับ upload success เพราะจะเปลี่ยน shape เป็น `{ success: true, data }`
- error contract ของ upload route เป็น `{ success: false, message }` แต่รอบนี้ยังไม่เปลี่ยน production route เพื่อปิด phase ด้วย test guard ก่อน
- `lib/client/adminGachaRewardsClient.ts` parse response ตรง ๆ และควรรองรับ `filename` เป็น optional field เพราะ route ส่ง `filename` อยู่แล้ว

ผลลัพธ์หลังทำ:

- เพิ่ม `filename?: string` ใน `AdminGachaRewardsResponse` เพื่อสะท้อน upload response contract ปัจจุบันโดยไม่เปลี่ยน runtime behavior
- เพิ่ม `tests/api/admin-gacha-upload-image.test.ts` เพื่อ lock unauthorized, missing file, upload options, success `{ success, url, filename }` และ upload error status/message ของ machine/reward upload routes
- อัปเดต `tests/lib/adminGachaRewardsClient.test.ts` ให้ guard `filename` จาก reward image upload response
- ไม่เปลี่ยน production response shape, status code, auth behavior, upload options, FormData field, saved filename/url behavior หรือ client contract
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 13.11: Admin gacha response wrapper final audit and phase close

สถานะล่าสุด: เสร็จ 2026-05-13

เป้าหมาย:

- ตรวจ route กลุ่ม admin gacha ทั้งหมดหลัง Step 13.3-13.10
- ยืนยันว่า route ที่ใช้ `{ success, data, message? }` ใช้ `gachaApiSuccess` / `gachaApiError` แล้ว
- ยืนยันว่า route ที่ยังใช้ `NextResponse.json` มีเหตุผลชัด เช่น `{ success: true }` ไม่มี `data` หรือ upload `{ success, url, filename }`
- บันทึก final notes เพื่อปิด Phase 13

ไฟล์ที่จะสร้าง:

- ไม่มี

ไฟล์ที่จะตรวจในรอบนี้:

- `app/api/admin/gacha-settings/route.ts`
- `app/api/admin/gacha-machines/route.ts`
- `app/api/admin/gacha-machines/[id]/route.ts`
- `app/api/admin/gacha-machines/[id]/duplicate/route.ts`
- `app/api/admin/gacha-machines/reorder/route.ts`
- `app/api/admin/gacha-machines/upload-image/route.ts`
- `app/api/admin/gacha-rewards/route.ts`
- `app/api/admin/gacha-rewards/[id]/route.ts`
- `app/api/admin/gacha-rewards/upload-image/route.ts`

ไฟล์ที่จะแก้ในรอบนี้:

- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ห้ามเปลี่ยน production response shape, status code, auth behavior, upload options, DB flow หรือ client contract
- ถ้าไม่พบ drift จะทำเฉพาะ final audit notes ไม่แก้ production code เพิ่ม
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped audit และยืนยันด้วย focused/full tests แทน

ผล final audit:

- `app/api/admin/gacha-settings/route.ts` ใช้ `gachaApiSuccess` / `gachaApiError` กับ response ที่เป็น `{ success, data, message? }` แล้ว
- `app/api/admin/gacha-machines/route.ts` ใช้ `gachaApiSuccess` / `gachaApiError` กับ GET/POST response แล้ว
- `app/api/admin/gacha-machines/[id]/route.ts` ใช้ wrapper กับ GET/PATCH/error response แล้ว และคง `NextResponse.json({ success: true })` สำหรับ DELETE success เพราะ contract เดิมไม่มี `data`
- `app/api/admin/gacha-machines/[id]/duplicate/route.ts` ใช้ wrapper กับ duplicate response `{ success: true, data: { id } }` แล้ว
- `app/api/admin/gacha-machines/reorder/route.ts` ใช้ `gachaApiError` กับ error response แล้ว และคง `NextResponse.json({ success: true })` สำหรับ success เพราะ contract เดิมไม่มี `data`
- `app/api/admin/gacha-rewards/route.ts` ใช้ wrapper กับ GET/POST/error response แล้ว
- `app/api/admin/gacha-rewards/[id]/route.ts` ใช้ wrapper กับ PUT/error response แล้ว และคง `NextResponse.json({ success: true })` สำหรับ DELETE success เพราะ contract เดิมไม่มี `data`
- `app/api/admin/gacha-machines/upload-image/route.ts` และ `app/api/admin/gacha-rewards/upload-image/route.ts` ยังใช้ `NextResponse.json` ตามเดิม เพราะ upload success contract คือ `{ success: true, url, filename }` ไม่ใช่ `{ success: true, data }`

สรุป Phase 13:

- helper `lib/features/gacha/apiResponse.ts` เหมาะกับ admin gacha route ที่คืน `{ success, data, message? }` หรือ `{ success: false, message? }`
- route ที่คืน success แบบไม่มี `data` หรือ upload response เฉพาะทางควรยังไม่ใช้ `gachaApiSuccess` เพื่อไม่เปลี่ยน client contract
- Step 13.3-13.11 ปิด phase ได้ โดยไม่มี production response shape/status/auth/DB/client contract change ที่ตั้งใจเปลี่ยน
- รอบนี้ไม่แก้ production code เพิ่ม และไม่ stage ไฟล์ใด ๆ

test หลังทำ:

- ผ่าน: `npx vitest run tests/lib/gachaApiResponse.test.ts tests/api/admin-gacha-content.test.ts tests/api/admin-gacha-upload-image.test.ts tests/api/zero-coverage-routes.test.ts tests/api/new-code-routes.test.ts tests/api/new-code-uncovered.test.ts tests/api/coverage-boost-2.test.ts tests/api/final-coverage-patch.test.ts tests/api/final-coverage-patch-4.test.ts tests/lib/adminGachaRewardsClient.test.ts` (10 files / 190 tests)
- ผ่าน: `npm test` (120 files / 1433 tests, skipped 6)
- ผ่าน: `npm run lint`

### Step 14.1: Content/settings response contract audit

สถานะล่าสุด: เสร็จ 2026-05-13

เป้าหมาย:

- ตรวจ route กลุ่ม content/settings หลังปิด admin gacha response wrapper phase
- บันทึก response contract ปัจจุบันก่อนเลือก candidate สำหรับ wrapper/helper รอบถัดไป
- แยก route ที่คืน raw object/array, `{ error }`, `{ success, data/message }`, และ `{ success: true }` เพื่อไม่เปลี่ยน client contract โดยไม่ตั้งใจ

ไฟล์ที่จะสร้าง:

- ไม่มี

ไฟล์ที่จะตรวจในรอบนี้:

- `app/api/admin/settings/route.ts`
- `app/api/admin/currency-settings/route.ts`
- `app/api/admin/news/route.ts`
- `app/api/admin/news/[id]/route.ts`
- `app/api/admin/popups/route.ts`
- `app/api/admin/popups/[id]/route.ts`
- `app/api/admin/footer-links/route.ts`
- `app/api/admin/footer-links/[id]/route.ts`
- `app/api/admin/footer-links/settings/route.ts`
- `app/api/news/route.ts`
- `app/api/popups/route.ts`
- `app/api/footer-widget/route.ts`
- `app/api/currency-settings/route.ts`
- `app/api/user/settings/route.ts`
- tests ที่ guard route/helper กลุ่ม content/settings เช่น `tests/api/admin-settings-products.test.ts`, `tests/api/admin-news.test.ts`, `tests/api/admin-sub-routes.test.ts`, `tests/api/public-routes.test.ts`, `tests/lib/footerLinks.test.ts`, `tests/lib/api.test.ts`, `tests/lib/validateBody.test.ts`

ไฟล์ที่จะแก้ในรอบนี้:

- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ห้ามเปลี่ยน production response shape, status code, auth behavior, validation message, DB flow หรือ client contract
- ถ้าไม่พบ cleanup ที่ปลอดภัยมาก จะทำเฉพาะ audit notes ไม่แก้ production code
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped audit และยืนยันด้วย focused/full tests แทน

ผล audit:

- `app/api/admin/settings/route.ts`
  - auth error: `{ success: false, message }` status `401`
  - GET success: `{ success: true, data }`
  - PUT success: `{ success: true, message, data }`
  - error path: `{ success: false, message, error? }`
  - เป็น route ที่ใกล้กับ helper แบบ success/data มากที่สุด แต่ต้อง guard error body ที่มี `message` และบางกรณีมี `error`
- `app/api/admin/currency-settings/route.ts`
  - GET/PUT success คืน raw settings object
  - auth/error path คืน `{ error }`
  - ยังไม่ควรห่อเป็น `{ success, data }` เพราะ client/test อาจอ่าน raw fields โดยตรง
- `app/api/admin/news/route.ts` และ `app/api/admin/news/[id]/route.ts`
  - GET list/detail success คืน raw array/object
  - POST success คืน raw object status `201`
  - PUT success คืน raw object
  - DELETE success คืน `{ success: true }`
  - auth/not-found/error path คืน `{ error }`
  - ยังไม่ควรใช้ generic success/data wrapper เพราะจะเปลี่ยน client contract
- `app/api/admin/popups/route.ts` และ `app/api/admin/popups/[id]/route.ts`
  - pattern เหมือน admin news: raw array/object สำหรับ success, `{ success: true }` สำหรับ DELETE, `{ error }` สำหรับ error
  - ยังไม่ควร migrate response shape
- `app/api/admin/footer-links/route.ts`
  - GET success คืน `{ settings, links }`
  - POST success คืน raw link object status `201`
  - auth/error path คืน `{ error }`
  - ยังไม่ควรห่อเป็น `{ success, data }`
- `app/api/admin/footer-links/[id]/route.ts`
  - PUT success คืน raw link object
  - DELETE success คืน `{ success: true }`
  - auth/error path คืน `{ error }`
  - ยังไม่ควรใช้ helper ที่เพิ่ม `data`
- `app/api/admin/footer-links/settings/route.ts`
  - GET/PUT success คืน raw settings object
  - auth/error path คืน `{ error }`
  - candidate ที่ปลอดภัยกว่าคือ error helper แบบ preserve `{ error }` เท่านั้น ไม่ใช่ success/data wrapper
- public routes `app/api/news/route.ts`, `app/api/popups/route.ts`, `app/api/currency-settings/route.ts`
  - success คืน raw array/settings object
  - error path คืน `{ error }`
  - ยังไม่ควร migrate เป็น `{ success, data }` เพราะเป็น public client contract
- `app/api/footer-widget/route.ts`
  - success/inactive/error คืน `{ settings, links }` ทั้งหมด โดย error path ใช้ status `500` แต่ยังคืน fallback body เดิม
  - ห้ามเปลี่ยนเป็น `{ error }` หรือ `{ success, data }` ถ้าไม่มี client audit เพิ่ม
- `app/api/user/settings/route.ts`
  - deprecated PATCH คืน `{ success: false, message }` status `410`
  - ไม่เกี่ยวกับ content migration รอบแรก และควรปล่อย contract เดิมไว้

candidate สำหรับ Step ถัดไป:

- Step 14.2 ควรเพิ่ม route contract guard สำหรับ content/settings representative routes ก่อนทำ helper:
  - admin settings `{ success, data/message }`
  - admin news raw list/object + delete `{ success: true }`
  - admin popups raw list/object + delete `{ success: true }`
  - admin/footer-links `{ settings, links }`, raw link, raw settings
  - public news/popups/currency raw body และ footer-widget fallback `{ settings, links }`
- ถ้าจะสร้าง helper ภายหลัง ควรเริ่มจาก helper เฉพาะ error body `{ error }` หรือ raw JSON response helper ที่ preserve body 100%
- ยังไม่ควรรวมกับ `gachaApiSuccess` หรือ `apiSuccess` เพราะจะเปลี่ยน shape ของ route กลุ่มนี้หลายจุด
- รอบนี้ไม่แก้ production code เพิ่ม และไม่ stage ไฟล์ใด ๆ

test หลังทำ:

- ผ่าน: `npx vitest run tests/api/admin-settings-products.test.ts tests/api/admin-news.test.ts tests/api/admin-sub-routes.test.ts tests/api/admin-missing-routes.test.ts tests/api/admin-id-routes.test.ts tests/api/admin-routes.test.ts tests/api/public-routes.test.ts tests/api/new-code-uncovered.test.ts tests/api/final-coverage-patch.test.ts tests/api/final-coverage-patch-3.test.ts tests/api/final-coverage-patch-6.test.ts tests/api/final-coverage-patch-7.test.ts tests/lib/footerLinks.test.ts tests/lib/api.test.ts tests/lib/validateBody.test.ts` (15 files / 272 tests)
- ผ่าน: `npm test` (120 files / 1433 tests, skipped 6)
- ผ่าน: `npm run lint`

### Step 14.2: Content/settings response contract guard tests

สถานะล่าสุด: เสร็จ 2026-05-13

เป้าหมาย:

- เพิ่ม test guard แบบ representative ให้ content/settings response contract ที่ audit ใน Step 14.1
- ยืนยันว่า route กลุ่มนี้ยัง preserve raw object/array, `{ error }`, `{ success, data/message }`, `{ success: true }` และ footer fallback body เดิม
- เตรียม safety net ก่อนสร้าง helper เฉพาะ content/settings ในรอบถัดไป

ไฟล์ที่จะสร้าง:

- `tests/api/content-settings-contracts.test.ts`

ไฟล์ที่จะแก้ในรอบนี้:

- `docs/planning/shared-layer-audit.md`

ไฟล์ที่จะไม่แก้ในรอบนี้:

- `app/api/admin/settings/route.ts`
- `app/api/admin/currency-settings/route.ts`
- `app/api/admin/news/route.ts`
- `app/api/admin/news/[id]/route.ts`
- `app/api/admin/popups/route.ts`
- `app/api/admin/popups/[id]/route.ts`
- `app/api/admin/footer-links/route.ts`
- `app/api/admin/footer-links/[id]/route.ts`
- `app/api/admin/footer-links/settings/route.ts`
- `app/api/news/route.ts`
- `app/api/popups/route.ts`
- `app/api/footer-widget/route.ts`
- `app/api/currency-settings/route.ts`
- `app/api/user/settings/route.ts`

ข้อจำกัดของรอบนี้:

- ห้ามเปลี่ยน production response shape, status code, auth behavior, validation message, DB flow หรือ client contract
- เพิ่มเฉพาะ tests และ audit notes
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped audit/test guard แทน

สิ่งที่เพิ่มใน Step 14.2:

- สร้าง `tests/api/content-settings-contracts.test.ts` เพื่อ lock representative response contracts ของ content/settings routes
- guard `app/api/admin/settings/route.ts` ว่า success ยังเป็น `{ success: true, data }` และ unauthorized ยังเป็น `{ success: false, message }`
- guard admin news/popups ว่า GET ยังคืน raw array และ DELETE ยังคืน `{ success: true }` โดยไม่มี `data`
- guard admin footer-links ว่า GET ยังคืน `{ settings, links }` และ footer settings ยังคืน raw settings object
- guard admin currency settings ว่า success ยังคืน raw settings object และ unauthorized ยังคืน `{ error: "Unauthorized" }`
- guard public news/popups/currency ว่ายังคืน raw array/object
- guard footer-widget ว่า active response และ error fallback ยังคืน `{ settings, links }`
- guard deprecated `app/api/user/settings/route.ts` ว่า PATCH ยังคืน `{ success: false, message }` status `410`
- รอบนี้ไม่แก้ production code เพิ่ม

candidate สำหรับ Step ถัดไป:

- Step 14.3 ควรสร้าง helper เฉพาะ content/settings error response ที่ preserve `{ error }` 100% เช่น `contentApiError(message, status)` หรือ helper ชื่อกลางที่ไม่บังคับ success shape
- ถ้าจะใช้กับ route จริง ให้เริ่มจาก route ที่ error shape เป็น `{ error }` ล้วน เช่น `app/api/admin/currency-settings/route.ts` หรือ `app/api/admin/footer-links/settings/route.ts`
- ยังไม่ควรแตะ public success raw body หรือ `{ settings, links }` fallback จนกว่าจะมี helper ที่ไม่เปลี่ยน body

test หลังทำ:

- ผ่าน: `npx vitest run tests/api/content-settings-contracts.test.ts` (1 file / 8 tests)
- ผ่าน: `npx vitest run tests/api/content-settings-contracts.test.ts tests/api/admin-settings-products.test.ts tests/api/admin-news.test.ts tests/api/admin-sub-routes.test.ts tests/api/admin-missing-routes.test.ts tests/api/admin-id-routes.test.ts tests/api/admin-routes.test.ts tests/api/public-routes.test.ts tests/api/new-code-uncovered.test.ts tests/api/final-coverage-patch.test.ts tests/api/final-coverage-patch-3.test.ts tests/api/final-coverage-patch-6.test.ts tests/api/final-coverage-patch-7.test.ts tests/lib/footerLinks.test.ts tests/lib/api.test.ts tests/lib/validateBody.test.ts` (16 files / 280 tests)
- ผ่าน: `npm test` (121 files / 1441 tests, skipped 6)
- ผ่าน: `npm run lint`

### Step 14.3: Content/settings error response helper

สถานะล่าสุด: เสร็จ 2026-05-13

เป้าหมาย:

- สร้าง helper เฉพาะ error response ที่ preserve body `{ error }` เดิม 100%
- เริ่มใช้กับ route ที่ปลอดภัยมากและ error shape เป็น `{ error }` ล้วน
- ไม่แตะ success raw object/array, `{ settings, links }`, `{ success, data/message }`, หรือ `{ success: true }`

ไฟล์ที่จะสร้าง:

- `lib/features/content/apiResponse.ts`
- `tests/lib/contentApiResponse.test.ts`

ไฟล์ที่จะแก้ในรอบนี้:

- `app/api/admin/currency-settings/route.ts`
- `app/api/admin/footer-links/settings/route.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ห้ามเปลี่ยน production response shape, status code, auth behavior, validation message, DB flow หรือ client contract
- helper ต้องคืน `{ error }` เท่านั้นสำหรับ route กลุ่มนี้
- ยังไม่แตะ public routes, success raw body, footer-widget fallback หรือ admin/settings wrapper
- ไม่ stage หรือรวม `.obsidian/workspace.json`

สิ่งที่เพิ่มใน Step 14.3:

- สร้าง `lib/features/content/apiResponse.ts` พร้อม `contentApiError(error, init)` ที่คืน `NextResponse.json({ error }, init)`
- สร้าง `tests/lib/contentApiResponse.test.ts` เพื่อ lock helper body/status
- ปรับ `app/api/admin/currency-settings/route.ts` ให้ใช้ `contentApiError` เฉพาะ unauthorized และ catch error paths
- ปรับ `app/api/admin/footer-links/settings/route.ts` ให้ใช้ `contentApiError` เฉพาะ unauthorized และ catch error paths
- ไม่แตะ success raw settings object, validation error จาก `validateBody`, DB flow, auth helper, public routes หรือ footer-widget fallback

candidate สำหรับ Step ถัดไป:

- Step 14.4 ควร apply `contentApiError` ต่อกับ route กลุ่ม content/settings ที่ยังเป็น `{ error }` ล้วน เช่น `admin/news`, `admin/popups`, `admin/footer-links`, และ detail routes
- ยังต้องคง success raw array/object และ DELETE `{ success: true }` เดิมทั้งหมด
- ถ้า route ไหนมี error shape ไม่ใช่ `{ error }` เช่น `admin/settings` หรือ `footer-widget` ให้ยังไม่ใช้ helper นี้

test หลังทำ:

- ผ่าน: `npx vitest run tests/lib/contentApiResponse.test.ts tests/api/content-settings-contracts.test.ts tests/api/admin-missing-routes.test.ts tests/api/admin-gacha-content.test.ts tests/api/final-coverage-patch-3.test.ts tests/lib/footerLinks.test.ts` (6 files / 122 tests)
- ผ่าน: `npx vitest run tests/lib/contentApiResponse.test.ts tests/api/content-settings-contracts.test.ts tests/api/admin-settings-products.test.ts tests/api/admin-news.test.ts tests/api/admin-sub-routes.test.ts tests/api/admin-missing-routes.test.ts tests/api/admin-id-routes.test.ts tests/api/admin-routes.test.ts tests/api/public-routes.test.ts tests/api/new-code-uncovered.test.ts tests/api/final-coverage-patch.test.ts tests/api/final-coverage-patch-3.test.ts tests/api/final-coverage-patch-6.test.ts tests/api/final-coverage-patch-7.test.ts tests/lib/footerLinks.test.ts tests/lib/api.test.ts tests/lib/validateBody.test.ts` (17 files / 282 tests)
- ผ่าน: `npm test` (122 files / 1443 tests, skipped 6)
- ผ่าน: `npm run lint`

### Step 14.4: Apply content error helper to admin content routes

สถานะล่าสุด: เสร็จ 2026-05-13

เป้าหมาย:

- ใช้ `contentApiError` ต่อกับ route กลุ่ม admin content/settings ที่ error body เป็น `{ error }` เดิมอยู่แล้ว
- คง success raw array/object, status `201`, DELETE `{ success: true }`, validation response และ audit/cache/DB flow เดิมทั้งหมด
- ยังไม่แตะ route ที่ error/success shape ไม่ตรง helper เช่น `admin/settings`, `footer-widget`, public routes หรือ admin gacha

ไฟล์ที่จะสร้าง:

- ไม่มี

ไฟล์ที่จะแก้ในรอบนี้:

- `app/api/admin/news/route.ts`
- `app/api/admin/news/[id]/route.ts`
- `app/api/admin/popups/route.ts`
- `app/api/admin/popups/[id]/route.ts`
- `app/api/admin/footer-links/route.ts`
- `app/api/admin/footer-links/[id]/route.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ห้ามเปลี่ยน production response shape, status code, auth behavior, validation message, DB flow, audit logging, cache invalidation หรือ client contract
- ใช้ helper เฉพาะ response ที่ body เดิมเป็น `{ error: string }`
- ไม่ stage หรือรวม `.obsidian/workspace.json`

สิ่งที่แก้ใน Step 14.4:

- ปรับ `app/api/admin/news/route.ts` ให้ใช้ `contentApiError` เฉพาะ unauthorized และ catch error paths
- ปรับ `app/api/admin/news/[id]/route.ts` ให้ใช้ `contentApiError` เฉพาะ unauthorized, not-found และ catch error paths
- ปรับ `app/api/admin/popups/route.ts` ให้ใช้ `contentApiError` เฉพาะ unauthorized และ catch error paths
- ปรับ `app/api/admin/popups/[id]/route.ts` ให้ใช้ `contentApiError` เฉพาะ unauthorized, not-found และ catch error paths
- ปรับ `app/api/admin/footer-links/route.ts` ให้ใช้ `contentApiError` เฉพาะ unauthorized และ catch error paths
- ปรับ `app/api/admin/footer-links/[id]/route.ts` ให้ใช้ `contentApiError` เฉพาะ unauthorized และ catch error paths
- คง success raw array/object, POST status `201`, DELETE `{ success: true }`, validation error จาก `validateBody`, audit logging, cache invalidation และ DB flow เดิมทั้งหมด
- ยังไม่แตะ `app/api/admin/settings/route.ts`, `app/api/footer-widget/route.ts` หรือ public routes เพราะ response shape ไม่ตรงกับ helper นี้

candidate สำหรับ Step ถัดไป:

- Step 14.5 ควรทำ cleanup/final audit ของ content error helper phase ตรวจว่า route ที่ใช้ `{ error }` ล้วนใช้ helper ครบเท่าที่ปลอดภัย
- route ที่ยังไม่ควร migrate: `admin/settings`, `footer-widget`, public raw success routes และ route ที่มี contract เฉพาะ
- ถ้าจะขยายต่อ ต้องเพิ่ม helper แบบ preserve raw success/fallback body แยกต่างหาก ไม่ใช้ `contentApiError`

test หลังทำ:

- ผ่าน: `npx vitest run tests/lib/contentApiResponse.test.ts tests/api/content-settings-contracts.test.ts tests/api/admin-news.test.ts tests/api/admin-routes.test.ts tests/api/admin-id-routes.test.ts tests/api/admin-sub-routes.test.ts tests/api/admin-missing-routes.test.ts tests/api/admin-gacha-content.test.ts tests/api/new-code-uncovered.test.ts tests/api/final-coverage-patch.test.ts tests/api/final-coverage-patch-3.test.ts tests/api/final-coverage-patch-6.test.ts tests/lib/footerLinks.test.ts tests/lib/api.test.ts tests/lib/validateBody.test.ts` (15 files / 271 tests)
- ผ่าน: `npx vitest run tests/lib/contentApiResponse.test.ts tests/api/content-settings-contracts.test.ts tests/api/admin-settings-products.test.ts tests/api/admin-news.test.ts tests/api/admin-sub-routes.test.ts tests/api/admin-missing-routes.test.ts tests/api/admin-id-routes.test.ts tests/api/admin-routes.test.ts tests/api/public-routes.test.ts tests/api/new-code-uncovered.test.ts tests/api/final-coverage-patch.test.ts tests/api/final-coverage-patch-3.test.ts tests/api/final-coverage-patch-6.test.ts tests/api/final-coverage-patch-7.test.ts tests/lib/footerLinks.test.ts tests/lib/api.test.ts tests/lib/validateBody.test.ts` (17 files / 282 tests)
- ผ่าน: `npm test` (122 files / 1443 tests, skipped 6)
- ผ่าน: `npm run lint`

### Step 14.5: Content error helper cleanup and final audit

สถานะล่าสุด: เสร็จ 2026-05-13

เป้าหมาย:

- ตรวจ route กลุ่ม content/settings หลัง Step 14.3-14.4 ว่าใช้ `contentApiError` ครบเท่าที่ปลอดภัย
- บันทึก route ที่ยังไม่ควร migrate เพราะ response contract ไม่ใช่ `{ error }` ล้วนหรืออยู่นอก scope phase นี้
- ปิด phase content error helper โดยไม่เปลี่ยน production behavior เพิ่ม

ไฟล์ที่จะสร้าง:

- ไม่มี

ไฟล์ที่จะตรวจในรอบนี้:

- `app/api/admin/currency-settings/route.ts`
- `app/api/admin/footer-links/settings/route.ts`
- `app/api/admin/news/route.ts`
- `app/api/admin/news/[id]/route.ts`
- `app/api/admin/popups/route.ts`
- `app/api/admin/popups/[id]/route.ts`
- `app/api/admin/footer-links/route.ts`
- `app/api/admin/footer-links/[id]/route.ts`
- `app/api/admin/settings/route.ts`
- `app/api/footer-widget/route.ts`
- `app/api/news/route.ts`
- `app/api/popups/route.ts`
- `app/api/currency-settings/route.ts`
- `lib/features/content/apiResponse.ts`
- `tests/lib/contentApiResponse.test.ts`
- `tests/api/content-settings-contracts.test.ts`

ไฟล์ที่จะแก้ในรอบนี้:

- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ห้ามเปลี่ยน production response shape, status code, auth behavior, validation message, DB flow, audit logging, cache invalidation หรือ client contract
- ถ้าไม่พบ drift จะทำเฉพาะ final audit notes ไม่แก้ production code เพิ่ม
- ไม่ stage หรือรวม `.obsidian/workspace.json`

ผล final audit:

- `contentApiError` คืนเฉพาะ `{ error }` และมี unit test guard ใน `tests/lib/contentApiResponse.test.ts`
- route admin content/settings ที่ migrate แล้ว:
  - `app/api/admin/currency-settings/route.ts`
  - `app/api/admin/footer-links/settings/route.ts`
  - `app/api/admin/news/route.ts`
  - `app/api/admin/news/[id]/route.ts`
  - `app/api/admin/popups/route.ts`
  - `app/api/admin/popups/[id]/route.ts`
  - `app/api/admin/footer-links/route.ts`
  - `app/api/admin/footer-links/[id]/route.ts`
- route เหล่านี้ยังคง success raw object/array, status `201`, DELETE `{ success: true }`, validation response, audit/cache/DB flow เดิม
- route ที่ตั้งใจยังไม่ migrate:
  - `app/api/admin/settings/route.ts` เพราะ error contract เป็น `{ success: false, message, error? }`
  - `app/api/footer-widget/route.ts` เพราะ error fallback contract เป็น `{ settings, links }`
  - public routes `app/api/news/route.ts`, `app/api/popups/route.ts`, `app/api/currency-settings/route.ts` เพราะ phase นี้ยังไม่แตะ public route contracts หลังเพิ่ม guard แล้ว
  - route admin domain อื่น เช่น users, roles, help, nav-items, season-pass เพราะอยู่นอก content/settings phase และต้อง audit แยก

สรุป Phase 14:

- Content/settings error helper phase ปิดได้สำหรับ admin content/settings routes ที่ปลอดภัย
- ถ้าจะขยายต่อ ควรทำ Step แยกสำหรับ public route error helper หรือ route domain อื่น พร้อม guard ก่อนแตะ production code
- รอบนี้ไม่แก้ production code เพิ่ม และไม่ stage ไฟล์ใด ๆ

test หลังทำ:

- ผ่าน: `npx vitest run tests/lib/contentApiResponse.test.ts tests/api/content-settings-contracts.test.ts tests/api/admin-settings-products.test.ts tests/api/admin-news.test.ts tests/api/admin-sub-routes.test.ts tests/api/admin-missing-routes.test.ts tests/api/admin-id-routes.test.ts tests/api/admin-routes.test.ts tests/api/public-routes.test.ts tests/api/new-code-uncovered.test.ts tests/api/final-coverage-patch.test.ts tests/api/final-coverage-patch-3.test.ts tests/api/final-coverage-patch-6.test.ts tests/api/final-coverage-patch-7.test.ts tests/lib/footerLinks.test.ts tests/lib/api.test.ts tests/lib/validateBody.test.ts` (17 files / 282 tests)
- ผ่าน: `npm test` (122 files / 1443 tests, skipped 6)
- ผ่าน: `npm run lint`

### Step 14.6: Public content error helper guard and safe use

สถานะล่าสุด: เสร็จ 2026-05-13

เป้าหมาย:

- ใช้ `contentApiError` กับ public content routes ที่ error body เป็น `{ error }` เดิมอยู่แล้ว
- เพิ่ม guard ให้ public error shape ของ news/popups/currency ชัดขึ้นก่อนขยายต่อ
- คง public success raw array/object และ footer-widget fallback `{ settings, links }` เดิมทั้งหมด

ไฟล์ที่จะสร้าง:

- ไม่มี

ไฟล์ที่จะแก้ในรอบนี้:

- `app/api/news/route.ts`
- `app/api/popups/route.ts`
- `app/api/currency-settings/route.ts`
- `tests/api/content-settings-contracts.test.ts`
- `docs/planning/shared-layer-audit.md`

ไฟล์ที่จะไม่แก้ในรอบนี้:

- `app/api/footer-widget/route.ts`
- admin domain routes นอก content/settings เช่น roles, help, nav-items, season-pass, users

ข้อจำกัดของรอบนี้:

- ห้ามเปลี่ยน production response shape, status code, cache behavior, DB flow หรือ client contract
- ใช้ helper เฉพาะ catch error ที่ body เดิมเป็น `{ error: string }`
- ไม่แตะ success raw response หรือ footer fallback
- ไม่ stage หรือรวม `.obsidian/workspace.json`

สิ่งที่แก้ใน Step 14.6:

- เพิ่ม public error contract guard ใน `tests/api/content-settings-contracts.test.ts` สำหรับ `app/api/news/route.ts`, `app/api/popups/route.ts` และ `app/api/currency-settings/route.ts`
- ปรับ `app/api/news/route.ts` ให้ใช้ `contentApiError` เฉพาะ catch error path
- ปรับ `app/api/popups/route.ts` ให้ใช้ `contentApiError` เฉพาะ catch error path
- ปรับ `app/api/currency-settings/route.ts` ให้ใช้ `contentApiError` เฉพาะ catch error path
- คง public success raw array/object, cache behavior, DB flow และ status เดิมทั้งหมด
- ยังไม่แตะ `app/api/footer-widget/route.ts` เพราะ error fallback contract เป็น `{ settings, links }`

candidate สำหรับ Step ถัดไป:

- Step 14.7 ควรทำ final audit หลังรวม public routes และปิด Phase 14 อีกครั้ง
- หลังจากนั้นควรข้ามไป domain ใหม่ เช่น admin navigation/help/roles/season-pass หรือทำภาพรวม remaining API response candidates ก่อนลงมือ

test หลังทำ:

- ผ่าน: `npx vitest run tests/lib/contentApiResponse.test.ts tests/api/content-settings-contracts.test.ts tests/api/public-routes.test.ts tests/api/final-coverage-patch.test.ts tests/api/final-coverage-patch-6.test.ts` (5 files / 69 tests)
- ผ่าน: `npx vitest run tests/lib/contentApiResponse.test.ts tests/api/content-settings-contracts.test.ts tests/api/admin-settings-products.test.ts tests/api/admin-news.test.ts tests/api/admin-sub-routes.test.ts tests/api/admin-missing-routes.test.ts tests/api/admin-id-routes.test.ts tests/api/admin-routes.test.ts tests/api/public-routes.test.ts tests/api/new-code-uncovered.test.ts tests/api/final-coverage-patch.test.ts tests/api/final-coverage-patch-3.test.ts tests/api/final-coverage-patch-6.test.ts tests/api/final-coverage-patch-7.test.ts tests/lib/footerLinks.test.ts tests/lib/api.test.ts tests/lib/validateBody.test.ts` (17 files / 283 tests)
- ผ่าน: `npm test` (122 files / 1444 tests, skipped 6)
- ผ่าน: `npm run lint`

### Step 14.7: Content error helper final audit after public routes

สถานะล่าสุด: เสร็จ 2026-05-14

เป้าหมาย:

- ตรวจ final state หลัง Step 14.3-14.6 ว่า `contentApiError` ถูกใช้กับ content/settings `{ error }` paths ที่ปลอดภัยแล้ว
- ยืนยันว่า route ที่ยังไม่ใช้ helper มีเหตุผลจาก response contract ชัดเจน
- ปิด Phase 14 หลังรวม admin และ public content error paths

ไฟล์ที่จะสร้าง:

- ไม่มี

ไฟล์ที่จะตรวจในรอบนี้:

- `lib/features/content/apiResponse.ts`
- `tests/lib/contentApiResponse.test.ts`
- `tests/api/content-settings-contracts.test.ts`
- `app/api/admin/currency-settings/route.ts`
- `app/api/admin/footer-links/settings/route.ts`
- `app/api/admin/news/route.ts`
- `app/api/admin/news/[id]/route.ts`
- `app/api/admin/popups/route.ts`
- `app/api/admin/popups/[id]/route.ts`
- `app/api/admin/footer-links/route.ts`
- `app/api/admin/footer-links/[id]/route.ts`
- `app/api/news/route.ts`
- `app/api/popups/route.ts`
- `app/api/currency-settings/route.ts`
- `app/api/admin/settings/route.ts`
- `app/api/footer-widget/route.ts`

ไฟล์ที่จะแก้ในรอบนี้:

- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ห้ามเปลี่ยน production response shape, status code, auth behavior, cache behavior, validation message, DB flow, audit logging หรือ client contract
- ถ้าไม่พบ drift จะทำเฉพาะ final audit notes ไม่แก้ production code เพิ่ม
- ไม่ stage หรือรวม `.obsidian/workspace.json`

ผล final audit หลังรวม public routes:

- `contentApiError` ยัง preserve `{ error }` และ status ผ่าน `ResponseInit` ตามเดิม
- admin routes ที่ใช้ helper แล้ว:
  - `app/api/admin/currency-settings/route.ts`
  - `app/api/admin/footer-links/settings/route.ts`
  - `app/api/admin/news/route.ts`
  - `app/api/admin/news/[id]/route.ts`
  - `app/api/admin/popups/route.ts`
  - `app/api/admin/popups/[id]/route.ts`
  - `app/api/admin/footer-links/route.ts`
  - `app/api/admin/footer-links/[id]/route.ts`
- public routes ที่ใช้ helper แล้ว:
  - `app/api/news/route.ts`
  - `app/api/popups/route.ts`
  - `app/api/currency-settings/route.ts`
- route ที่ยังตั้งใจไม่ใช้ helper:
  - `app/api/admin/settings/route.ts` เพราะ error contract คือ `{ success: false, message, error? }`
  - `app/api/footer-widget/route.ts` เพราะ fallback contract คือ `{ settings, links }` ทั้ง success/inactive/error
- `tests/api/content-settings-contracts.test.ts` guard ครอบคลุม admin settings exception, admin raw success/delete shapes, public raw success/error shapes, footer-widget fallback และ deprecated user settings

สรุป Phase 14 หลัง Step 14.7:

- Content/settings `{ error }` helper phase ปิดได้ทั้ง admin และ public content routes ที่ปลอดภัย
- ยังไม่ควรบังคับ success wrapper ในกลุ่มนี้ เพราะหลาย endpoint ตั้งใจคืน raw object/array หรือ fallback body เฉพาะทาง
- ถ้าจะทำต่อ ควรเริ่ม Step/Phase ใหม่ด้วย audit ของ domain อื่น เช่น `admin/help`, `admin/nav-items`, `admin/roles`, `admin/season-pass` หรือทำภาพรวม remaining API response candidates ก่อนเลือก route
- รอบนี้ไม่แก้ production code เพิ่ม และไม่ stage ไฟล์ใด ๆ

test หลังทำ:

- ผ่าน: `npx vitest run tests/lib/contentApiResponse.test.ts tests/api/content-settings-contracts.test.ts tests/api/admin-settings-products.test.ts tests/api/admin-news.test.ts tests/api/admin-sub-routes.test.ts tests/api/admin-missing-routes.test.ts tests/api/admin-id-routes.test.ts tests/api/admin-routes.test.ts tests/api/public-routes.test.ts tests/api/new-code-uncovered.test.ts tests/api/final-coverage-patch.test.ts tests/api/final-coverage-patch-3.test.ts tests/api/final-coverage-patch-6.test.ts tests/api/final-coverage-patch-7.test.ts tests/lib/footerLinks.test.ts tests/lib/api.test.ts tests/lib/validateBody.test.ts` (17 files / 283 tests)
- ผ่าน: `npm test` (122 files / 1444 tests, skipped 6)
- ผ่าน: `npm run lint`

### Step 15.1: Remaining API response candidates audit

สถานะล่าสุด: เสร็จ 2026-05-14

เป้าหมาย:

- สแกน route ที่ยังมี response helper/shape กระจายหลังปิด Phase 14
- จัดกลุ่ม candidate ถัดไปตาม response contract ไม่ใช่ตามความรู้สึก
- ระบุว่า domain ไหนควรทำต่อเป็น Step ถัดไป และ domain ไหนยังไม่ควรแตะเพราะต้อง guard contract เพิ่ม

ไฟล์ที่จะสร้าง:

- ไม่มี

ไฟล์ที่จะตรวจในรอบนี้:

- `app/api/admin/**/route.ts`
- `app/api/**/route.ts`
- tests ที่ครอบคลุม candidate routes เช่น `tests/api/admin-id-routes.test.ts`, `tests/api/admin-sub-routes.test.ts`, `tests/api/admin-routes.test.ts`, `tests/api/help-routes-regression.test.ts`, `tests/api/final-coverage-patch*.test.ts`

ไฟล์ที่จะแก้ในรอบนี้:

- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ห้ามเปลี่ยน production response shape, status code, auth behavior, validation message, DB flow, audit logging, cache behavior หรือ client contract
- ถ้าไม่พบ cleanup ที่ปลอดภัยมาก จะทำเฉพาะ audit notes ไม่แก้ production code
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำ manual scoped audit แทน

ผล audit:

- กลุ่มที่ปิดแล้ว:
  - admin gacha routes ที่ใช้ `{ success, data, message? }` ใช้ `gachaApiSuccess` / `gachaApiError` แล้วตาม Phase 13
  - content/settings routes ที่ error body เป็น `{ error }` ใช้ `contentApiError` แล้วตาม Phase 14
- กลุ่ม `{ error }` ที่ยังเป็น candidate ถัดไป:
  - `app/api/admin/nav-items/route.ts`
  - `app/api/admin/nav-items/[id]/route.ts`
  - `app/api/admin/help/route.ts`
  - `app/api/admin/help/[id]/route.ts`
  - `app/api/admin/help-videos/route.ts`
  - `app/api/admin/help-videos/[id]/route.ts`
  - `app/api/admin/roles/route.ts`
  - `app/api/admin/roles/[id]/route.ts`
  - `app/api/nav-items/route.ts`
- tests ที่มีอยู่แล้วสำหรับกลุ่ม candidate:
  - `tests/api/admin-sub-routes.test.ts`
  - `tests/api/admin-gacha-content.test.ts`
  - `tests/api/admin-routes.test.ts`
  - `tests/api/admin-id-routes.test.ts`
  - `tests/api/admin-promo-roles.test.ts`
  - `tests/api/admin-zero-coverage.test.ts`
  - `tests/api/help-routes-regression.test.ts`
  - `tests/api/coverage-boost-2.test.ts`
  - `tests/api/final-coverage-patch.test.ts`
  - `tests/api/final-coverage-patch-2.test.ts`
  - `tests/api/final-coverage-patch-3.test.ts`
  - `tests/api/final-coverage-patch-5.test.ts`
  - `tests/api/final-coverage-patch-7.test.ts`
- กลุ่มที่ยังไม่ควรปนกับ helper `{ error }`:
  - chat routes ใช้ `{ success: false, message }` และ success เช่น `{ success: true, conversation }`
  - products/purchase/orders/dashboard/profile ใช้ `{ success: false, message }` พร้อม client contract เฉพาะ
  - topup/slips/upload routes ใช้ `{ success: false, message }` และเกี่ยวกับไฟล์/เงิน/สถานะ
  - gacha upload/category routes มี contract เฉพาะ เช่น `{ success: false }` หรือ `{ success, url, filename }`
  - `app/api/admin/settings/route.ts` ยังเป็น `{ success: false, message, error? }`
  - `app/api/footer-widget/route.ts` ยังเป็น fallback `{ settings, links }`
- กลุ่ม season-pass ใช้ `{ error }` หลายจุด แต่มี plan/rewards/upload แยกกัน และ upload ใช้ `{ success: false, message }` จึงควรทำเป็น phase แยกหลัง nav/help/roles

candidate สำหรับ Step ถัดไป:

- Step 15.2 ควรเริ่มจาก contract guard tests สำหรับ admin nav/help/roles ก่อนใช้ `contentApiError`
- route ที่เหมาะเริ่มก่อนคือ `admin/nav-items` และ public `nav-items` เพราะ contract ใกล้ content routes มากที่สุด
- `admin/help`, `admin/help-videos`, `admin/roles` ควรตามมาใน step ย่อยถัดไปหลังมี guard ชัดขึ้น
- รอบนี้ไม่แก้ production code เพิ่ม และไม่ stage ไฟล์ใด ๆ

test หลังทำ:

- ผ่าน: `npx vitest run tests/api/admin-sub-routes.test.ts tests/api/admin-gacha-content.test.ts tests/api/admin-routes.test.ts tests/api/admin-id-routes.test.ts tests/api/admin-promo-roles.test.ts tests/api/admin-zero-coverage.test.ts tests/api/help-routes-regression.test.ts tests/api/coverage-boost-2.test.ts tests/api/admin-season-pass-plan.test.ts tests/api/final-coverage-patch.test.ts tests/api/final-coverage-patch-2.test.ts tests/api/final-coverage-patch-3.test.ts tests/api/final-coverage-patch-5.test.ts tests/api/final-coverage-patch-7.test.ts` (14 files / 284 tests)
- ผ่าน: `npm test` (122 files / 1444 tests, skipped 6)
- ผ่าน: `npm run lint`

### Step 15.2: Nav items error helper guard and safe use

สถานะล่าสุด: เสร็จ 2026-05-14

เป้าหมาย:

- เพิ่ม contract guard ให้ route กลุ่ม nav-items ก่อนใช้ shared error helper
- ใช้ `contentApiError` เฉพาะ response ที่ body เดิมเป็น `{ error }`
- คง success response เดิมทั้งหมด เช่น public raw array, admin raw array/object, POST status 201 และ DELETE `{ success: true }`

ไฟล์ที่จะสร้าง:

- ไม่มี

ไฟล์ที่จะตรวจ/แก้ในรอบนี้:

- `app/api/nav-items/route.ts`
- `app/api/admin/nav-items/route.ts`
- `app/api/admin/nav-items/[id]/route.ts`
- `tests/api/content-settings-contracts.test.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ห้ามเปลี่ยน production response shape, status code, auth behavior, validation message, DB flow, default nav insert behavior หรือ client contract
- ไม่แตะ route อื่น เช่น `admin/help`, `admin/help-videos`, `admin/roles`, `season-pass`
- ไม่ stage หรือรวม `.obsidian/workspace.json`

สิ่งที่ทำ:

- เพิ่ม contract guard ใน `tests/api/content-settings-contracts.test.ts` สำหรับ:
  - public `GET /api/nav-items` success raw array และ error `{ error: "Failed to fetch nav items" }`
  - admin `GET /api/admin/nav-items` unauthorized/error `{ error }`
  - admin `PUT/DELETE /api/admin/nav-items/[id]` unauthorized/error `{ error }` และ DELETE success `{ success: true }`
- ใช้ `contentApiError` ใน `app/api/nav-items/route.ts`
- ใช้ `contentApiError` ใน `app/api/admin/nav-items/route.ts` เฉพาะ unauthorized/catch paths
- ใช้ `contentApiError` ใน `app/api/admin/nav-items/[id]/route.ts` เฉพาะ unauthorized/catch paths
- ไม่เปลี่ยน success response, POST 201, DELETE success body, validation flow, default nav insert flow หรือ DB flow

สรุปหลังทำ:

- Step 15.2 ปิดกลุ่ม `nav-items` แล้ว
- route ที่ยังเหมาะทำต่อใน Step 15.3 คือ `admin/help` และ `admin/help-videos` เพราะยังเป็น `{ error }` ใกล้กับ helper เดิม
- `admin/roles` ควรตามหลัง help เพราะ role route ผูก permission/validation มากกว่า
- `season-pass` ยังควรแยก phase เพราะมีหลาย sub-route และ response contract ปนกัน

test หลังทำ:

- ผ่าน: `npx vitest run tests/lib/contentApiResponse.test.ts tests/api/content-settings-contracts.test.ts tests/api/public-routes.test.ts tests/api/admin-sub-routes.test.ts tests/api/admin-gacha-content.test.ts tests/api/coverage-boost-2.test.ts tests/api/final-coverage-patch.test.ts tests/api/final-coverage-patch-3.test.ts` (8 files / 150 tests)
- ผ่าน: `npm test` (122 files / 1446 tests, skipped 6)
- ผ่าน: `npm run lint`

### Step 15.3: Admin help/help-videos error helper guard and safe use

สถานะล่าสุด: เสร็จ 2026-05-14

เป้าหมาย:

- เพิ่ม contract guard ให้ route กลุ่ม `admin/help` และ `admin/help-videos`
- ใช้ `contentApiError` เฉพาะ response ที่ body เดิมเป็น `{ error }`
- คง success response เดิมทั้งหมด เช่น raw array/object, POST status เดิม และ DELETE `{ success: true }`
- คง exception ของ `GET /api/admin/help` catch ที่เดิมคืน `[]` พร้อม status 500

ไฟล์ที่จะสร้าง:

- `tests/api/content-help-contracts.test.ts`

ไฟล์ที่จะตรวจ/แก้ในรอบนี้:

- `app/api/admin/help/route.ts`
- `app/api/admin/help/[id]/route.ts`
- `app/api/admin/help-videos/route.ts`
- `app/api/admin/help-videos/[id]/route.ts`
- `tests/api/content-help-contracts.test.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ห้ามเปลี่ยน production response shape, status code, auth behavior, validation message, DB flow, audit logging, YouTube URL normalization หรือ client contract
- ไม่แตะ route อื่น เช่น `admin/roles`, `season-pass`, upload routes
- ไม่ stage หรือรวม `.obsidian/workspace.json`

สิ่งที่ทำ:

- เพิ่ม `tests/api/content-help-contracts.test.ts` เพื่อ guard contract ของ:
  - `GET /api/admin/help` success raw array และ error fallback `[]` status 500
  - `POST /api/admin/help` unauthorized/error `{ error }`
  - `PUT/DELETE /api/admin/help/[id]` not found/error `{ error }` และ DELETE success `{ success: true }`
  - `GET/POST /api/admin/help-videos` success raw array, invalid YouTube URL `{ error }`, และ error `{ error }`
  - `PUT/DELETE /api/admin/help-videos/[id]` not found/invalid/error `{ error }` และ DELETE success `{ success: true }`
- ใช้ `contentApiError` ใน `app/api/admin/help/route.ts` เฉพาะ unauthorized และ create catch path
- ใช้ `contentApiError` ใน `app/api/admin/help/[id]/route.ts` เฉพาะ unauthorized/not found/catch paths
- ใช้ `contentApiError` ใน `app/api/admin/help-videos/route.ts` เฉพาะ unauthorized/invalid URL/catch paths
- ใช้ `contentApiError` ใน `app/api/admin/help-videos/[id]/route.ts` เฉพาะ unauthorized/not found/invalid URL/catch paths
- คง `GET /api/admin/help` catch เป็น `NextResponse.json([], { status: 500 })` เพราะเป็น contract เดิมที่ไม่ใช่ `{ error }`
- ไม่เปลี่ยน success response, POST status เดิม, DELETE success body, validation flow, audit flow, DB flow หรือ YouTube normalization

สรุปหลังทำ:

- Step 15.3 ปิดกลุ่ม `admin/help` และ `admin/help-videos` แล้ว
- route ที่เหมาะทำต่อใน Step 15.4 คือ `admin/roles` เพราะยังเป็นกลุ่ม `{ error }` แต่มี permission/validation contract ที่ควร guard แยก
- `season-pass` ยังควรแยก phase หลังจากปิดกลุ่ม admin content/role เพราะ response contract ปนกันหลายแบบ

test หลังทำ:

- ผ่าน: `npx vitest run tests/api/content-help-contracts.test.ts tests/api/help-routes-regression.test.ts tests/api/admin-routes.test.ts tests/api/admin-zero-coverage.test.ts tests/api/final-coverage-patch.test.ts tests/api/final-coverage-patch-2.test.ts tests/api/final-coverage-patch-5.test.ts tests/api/final-coverage-patch-7.test.ts tests/lib/contentApiResponse.test.ts` (9 files / 160 tests)
- รอบ `npm test` แรกเจอ timeout/flaky ในไฟล์นอก scope หลายไฟล์ แต่ rerun failed subset ผ่าน: `npx vitest run tests/api/auth-password-reset.test.ts tests/api/coverage-boost.test.ts tests/api/final-coverage-patch.test.ts tests/api/final-coverage-patch-2.test.ts tests/api/final-coverage-patch-3.test.ts tests/api/season-pass-purchase.test.ts` (6 files / 139 tests, skipped 5)
- รอบ `npm test` ถัดมา timeout ที่ `tests/lib/auth-config.test.ts` แต่ rerun เดี่ยวผ่าน: `npx vitest run tests/lib/auth-config.test.ts` (1 file / 2 tests)
- ผ่านรอบสุดท้าย: `npm test` (123 files / 1450 tests, skipped 6)
- ผ่าน: `npm run lint`

### Step 15.4: Admin roles error helper guard and safe use

สถานะล่าสุด: เสร็จ 2026-05-14

เป้าหมาย:

- เพิ่ม contract guard ให้ route กลุ่ม `admin/roles`
- ใช้ `contentApiError` เฉพาะ response ที่ body เดิมเป็น `{ error }`
- คง success response เดิมทั้งหมด เช่น raw role array/object, POST status 201 และ DELETE `{ success: true }`
- คง validation/manual error เดิม เช่น `Name is required`, `Role not found`, `Cannot delete system role`

ไฟล์ที่จะสร้าง:

- `tests/api/content-roles-contracts.test.ts`

ไฟล์ที่จะตรวจ/แก้ในรอบนี้:

- `app/api/admin/roles/route.ts`
- `app/api/admin/roles/[id]/route.ts`
- `tests/api/content-roles-contracts.test.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ห้ามเปลี่ยน production response shape, status code, auth behavior, validation message, DB flow, audit logging, role code normalization หรือ client contract
- ไม่แตะ route อื่น เช่น `season-pass`, user role assignment, upload routes
- ไม่ stage หรือรวม `.obsidian/workspace.json`

สิ่งที่ทำ:

- เพิ่ม `tests/api/content-roles-contracts.test.ts` เพื่อ guard contract ของ:
  - `GET /api/admin/roles` success raw array, unauthorized `{ error }`, และ DB error `{ error: "Failed to fetch roles" }`
  - `POST /api/admin/roles` success raw object status 201 และ create error `{ error: "Failed to create role" }`
  - `GET/PUT /api/admin/roles/[id]` not found `{ error: "Role not found" }`, missing name `{ error: "Name is required" }`, และ update success raw object
  - `DELETE /api/admin/roles/[id]` system-role guard `{ error: "Cannot delete system role" }`, success `{ success: true }`, และ delete error `{ error: "Failed to delete role" }`
- ใช้ `contentApiError` ใน `app/api/admin/roles/route.ts` เฉพาะ unauthorized/catch paths
- ใช้ `contentApiError` ใน `app/api/admin/roles/[id]/route.ts` เฉพาะ unauthorized/not found/manual validation/catch paths
- ไม่เปลี่ยน success response, POST status 201, DELETE success body, validation flow, role code normalization, permission normalization, audit flow หรือ DB flow

สรุปหลังทำ:

- Step 15.4 ปิดกลุ่ม `admin/roles` แล้ว
- กลุ่ม `{ error }` หลักจาก Step 15.1 ที่เลือกมา (`nav-items`, `help/help-videos`, `roles`) ปิดครบ
- `season-pass` ยังควรเริ่มเป็น phase ใหม่ เพราะมีหลาย sub-route และมี response contract ปนระหว่าง `{ error }` กับ `{ success, message }`

test หลังทำ:

- ผ่าน: `npx vitest run tests/api/content-roles-contracts.test.ts tests/api/admin-routes.test.ts tests/api/admin-promo-roles.test.ts tests/api/admin-id-routes.test.ts tests/api/final-coverage-patch.test.ts tests/api/final-coverage-patch-3.test.ts tests/lib/contentApiResponse.test.ts` (7 files / 121 tests)
- รอบ `npm test` แรกเจอ timeout/flaky ในไฟล์นอก scope (`tests/api/coverage-boost.test.ts`, `tests/api/admin-slip-image.test.ts`) แต่ rerun failed subset ผ่าน: `npx vitest run tests/api/coverage-boost.test.ts tests/api/admin-slip-image.test.ts` (2 files / 29 tests, skipped 5)
- `npm test` รอบถัดมาครั้งหนึ่งหมดเวลาโดยไม่มี output สรุปผล จึง rerun ด้วย timeout ยาวขึ้น
- ผ่านรอบสุดท้าย: `npm test` (124 files / 1454 tests, skipped 6)
- ผ่าน: `npm run lint`

### Step 16.1: Admin season-pass plan/rewards error helper guard and safe use

สถานะล่าสุด: เสร็จ 2026-05-14

เป้าหมาย:

- เริ่ม phase ใหม่ของ season-pass จาก route ที่ contract เป็น `{ error }` ชัดเจนก่อน
- เพิ่ม contract guard ให้ `admin/season-pass/plan` และ `admin/season-pass/rewards`
- ใช้ `contentApiError` เฉพาะ response ที่ body เดิมเป็น `{ error }`
- คง route ที่ใช้ `{ success, message }` เช่น upload-image, purchase, claim ไว้สำหรับ step แยก

ไฟล์ที่จะสร้าง:

- `tests/api/content-season-pass-contracts.test.ts`

ไฟล์ที่จะตรวจ/แก้ในรอบนี้:

- `app/api/admin/season-pass/plan/route.ts`
- `app/api/admin/season-pass/rewards/route.ts`
- `tests/api/content-season-pass-contracts.test.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ห้ามเปลี่ยน production response shape, status code, auth behavior, validation message, DB flow, reward update behavior, upload behavior, purchase/claim behavior หรือ client contract
- ไม่แตะ `app/api/admin/season-pass/upload-image/route.ts`, `app/api/season-pass/purchase/route.ts`, `app/api/season-pass/claim/route.ts`
- ไม่ stage หรือรวม `.obsidian/workspace.json`

สิ่งที่ทำ:

- เพิ่ม `tests/api/content-season-pass-contracts.test.ts` เพื่อ guard contract ของ:
  - `GET /api/admin/season-pass/plan` success raw object, unauthorized `{ error }`, และ fetch error `{ error: "Failed to fetch season pass plan" }`
  - `PUT /api/admin/season-pass/plan` validation errors `{ error }`, update success raw object และ fixed 30-day board message
  - `GET /api/admin/season-pass/rewards` success raw array และ fetch error `{ error: "Failed to fetch season pass rewards" }`
  - `PUT /api/admin/season-pass/rewards` validation errors `{ error }`, update success raw array และ dynamic error message จาก service
- ใช้ `contentApiError` ใน `app/api/admin/season-pass/plan/route.ts` เฉพาะ unauthorized/validation/catch paths
- ใช้ `contentApiError` ใน `app/api/admin/season-pass/rewards/route.ts` เฉพาะ unauthorized/validation/catch paths
- ไม่เปลี่ยน success response, validation messages, status codes, update flow, reward normalization หรือ service calls
- ไม่แตะ route ที่ contract เป็น `{ success, message }` ได้แก่ upload-image, purchase, claim

สรุปหลังทำ:

- Step 16.1 ปิดกลุ่ม admin season-pass plan/rewards ที่ใช้ `{ error }` แล้ว
- Step ถัดไปควรเป็น Step 16.2 audit/guard ของ `app/api/admin/season-pass/upload-image/route.ts` เพราะเป็น `{ success, message }` และเกี่ยวกับไฟล์อัปโหลด
- public `purchase` และ `claim` ควรทำหลัง upload-image เพราะเป็น transaction/CSRF/user balance flow ที่เสี่ยงกว่า

test หลังทำ:

- ผ่าน: `npx vitest run tests/api/content-season-pass-contracts.test.ts tests/api/admin-season-pass-plan.test.ts tests/api/season-pass-purchase.test.ts tests/api/season-pass-claim.test.ts tests/lib/contentApiResponse.test.ts` (5 files / 12 tests)
- ผ่าน: `npm test` (125 files / 1458 tests, skipped 6)
- ผ่าน: `npm run lint`

### Step 16.2: Admin season-pass upload-image response guard and safe helper

สถานะล่าสุด: เสร็จ 2026-05-14

เป้าหมาย:

- เพิ่ม contract guard ให้ `app/api/admin/season-pass/upload-image/route.ts`
- สร้าง helper เฉพาะ season-pass สำหรับ error contract `{ success: false, message? }`
- ใช้ helper เฉพาะ error paths ของ upload-image โดยคง success `{ success: true, url, filename }` เดิม
- คง purchase/claim ไว้สำหรับ step แยก เพราะเป็น transaction/CSRF/user balance flow

ไฟล์ที่จะสร้าง:

- `lib/features/seasonPass/apiResponse.ts`
- `tests/lib/seasonPassApiResponse.test.ts`
- `tests/api/season-pass-upload-image-contracts.test.ts`

ไฟล์ที่จะตรวจ/แก้ในรอบนี้:

- `app/api/admin/season-pass/upload-image/route.ts`
- `lib/features/seasonPass/apiResponse.ts`
- `tests/lib/seasonPassApiResponse.test.ts`
- `tests/api/season-pass-upload-image-contracts.test.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ห้ามเปลี่ยน production response shape, status code, auth behavior, file field name, upload options, saved filename/url contract, upload directory, MIME/size behavior หรือ client contract
- ไม่แตะ `app/api/season-pass/purchase/route.ts` และ `app/api/season-pass/claim/route.ts`
- ไม่ stage หรือรวม `.obsidian/workspace.json`

สิ่งที่ทำ:

- เพิ่ม `lib/features/seasonPass/apiResponse.ts` สำหรับ error contract `{ success: false, message? }`
- เพิ่ม `tests/lib/seasonPassApiResponse.test.ts` เพื่อ guard helper ทั้งกรณีมี message และไม่มี message
- เพิ่ม `tests/api/season-pass-upload-image-contracts.test.ts` เพื่อ guard:
  - unauthorized `{ success: false, message }` status 401
  - missing file `{ success: false, message: "ไม่พบไฟล์รูปที่อัปโหลด" }` status 400
  - success `{ success: true, url, filename }`
  - upload options เดิม เช่น allowed types, max size, max dimension, output quality, upload dir, public path
  - upload error status selection 400 สำหรับ file/image error และ 500 สำหรับ error อื่น
- ใช้ `seasonPassApiError` ใน `app/api/admin/season-pass/upload-image/route.ts` เฉพาะ unauthorized/missing file/catch paths
- คง success response, file field name, upload options, saved filename/url contract และ upload directory เดิมทั้งหมด

สรุปหลังทำ:

- Step 16.2 ปิด `admin/season-pass/upload-image` แล้ว
- helper `seasonPassApiError` พร้อมใช้กับ route season-pass ที่เป็น `{ success: false, message }`
- Step ถัดไปควรเป็น Step 16.3 audit/guard ของ public `app/api/season-pass/purchase/route.ts` และ `app/api/season-pass/claim/route.ts` แต่ควรเริ่มจาก guard ก่อน เพราะเป็น transaction/CSRF/user balance flow

test หลังทำ:

- ผ่าน: `npx vitest run tests/lib/seasonPassApiResponse.test.ts tests/api/season-pass-upload-image-contracts.test.ts tests/api/content-season-pass-contracts.test.ts tests/api/admin-season-pass-plan.test.ts tests/api/season-pass-purchase.test.ts tests/api/season-pass-claim.test.ts` (6 files / 17 tests)
- ผ่าน: `npm test` (127 files / 1465 tests, skipped 6)
- ผ่าน: `npm run lint`

### Step 16.3: Public season-pass purchase/claim response guard and safe helper use

สถานะล่าสุด: เสร็จ 2026-05-14

เป้าหมาย:

- เพิ่ม contract guard ให้ `app/api/season-pass/purchase/route.ts` และ `app/api/season-pass/claim/route.ts`
- ใช้ `seasonPassApiError` เฉพาะ error paths ที่ route ห่อเป็น `{ success: false, message }`
- คง success body จาก `purchaseSeasonPass` และ `claimSeasonPass` เดิมทั้งหมด
- ไม่แตะ transaction service, CSRF helper, auth/session lookup หรือ balance/reward DB flow

ไฟล์ที่จะสร้าง:

- `tests/api/season-pass-route-contracts.test.ts`

ไฟล์ที่จะตรวจ/แก้ในรอบนี้:

- `app/api/season-pass/purchase/route.ts`
- `app/api/season-pass/claim/route.ts`
- `tests/api/season-pass-route-contracts.test.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ห้ามเปลี่ยน production response shape, status code, auth behavior, CSRF behavior, transaction behavior, user balance flow, reward claim flow, audit logging หรือ client contract
- ไม่แก้ `lib/seasonPassTransactions.ts` ในรอบนี้
- ไม่ stage หรือรวม `.obsidian/workspace.json`

สิ่งที่ทำ:

- เพิ่ม `tests/api/season-pass-route-contracts.test.ts` เพื่อ guard contract ของ:
  - `POST /api/season-pass/purchase` unauthenticated fallback, CSRF auth error, service error และ success body จาก `purchaseSeasonPass`
  - `POST /api/season-pass/claim` CSRF auth error, service error, role forwarding และ success body จาก `claimSeasonPass`
- ใช้ `seasonPassApiError` ใน `app/api/season-pass/purchase/route.ts` เฉพาะ unauthenticated และ service error paths
- ใช้ `seasonPassApiError` ใน `app/api/season-pass/claim/route.ts` เฉพาะ unauthenticated และ service error paths
- คง success response จาก `purchaseSeasonPass` และ `claimSeasonPass` เดิมทั้งหมด
- ไม่แตะ `lib/seasonPassTransactions.ts`, CSRF helper, auth/session lookup, transaction SQL, user balance flow, reward claim flow หรือ audit logging

สรุปหลังทำ:

- Step 16.3 ปิด public purchase/claim route wrapper แล้ว
- Season-pass response-helper phase ปิดครบ 3 ส่วนหลัก:
  - admin plan/rewards `{ error }` ใช้ `contentApiError`
  - admin upload-image `{ success: false, message }` ใช้ `seasonPassApiError`
  - public purchase/claim `{ success: false, message }` ใช้ `seasonPassApiError`
- ถ้าจะทำ season-pass ต่อ ควรเป็น cleanup/final audit แยก ไม่ควรย้าย transaction logic ในรอบเล็กนี้

test หลังทำ:

- ผ่าน: `npx vitest run tests/api/season-pass-route-contracts.test.ts tests/api/season-pass-purchase.test.ts tests/api/season-pass-claim.test.ts tests/lib/seasonPassApiResponse.test.ts tests/api/season-pass-upload-image-contracts.test.ts tests/api/content-season-pass-contracts.test.ts` (6 files / 19 tests)
- ผ่าน: `npm test` (128 files / 1468 tests, skipped 6)
- ผ่าน: `npm run lint`

### Step 16.4: Season-pass response cleanup and final audit

สถานะล่าสุด: เสร็จ 2026-05-14

เป้าหมาย:

- ปิด phase season-pass response helper ด้วย cleanup/final audit
- ตรวจ `contentApiError` และ `seasonPassApiError` usage ว่าใช้กับ contract ถูกกลุ่ม
- cleanup เฉพาะ import/flow/readability/test naming ในไฟล์ที่แตะจาก Step 16.1-16.3
- ไม่ย้าย transaction logic หรือ service logic เพิ่ม

ไฟล์ที่จะสร้าง:

- ไม่มี

ไฟล์ที่จะตรวจ/แก้ในรอบนี้:

- `app/api/admin/season-pass/plan/route.ts`
- `app/api/admin/season-pass/rewards/route.ts`
- `app/api/admin/season-pass/upload-image/route.ts`
- `app/api/season-pass/purchase/route.ts`
- `app/api/season-pass/claim/route.ts`
- `lib/features/seasonPass/apiResponse.ts`
- `tests/api/content-season-pass-contracts.test.ts`
- `tests/api/season-pass-upload-image-contracts.test.ts`
- `tests/api/season-pass-route-contracts.test.ts`
- `tests/lib/seasonPassApiResponse.test.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ห้ามเปลี่ยน production response shape, status code, auth behavior, CSRF behavior, transaction behavior, upload behavior, user balance flow, reward claim flow, audit logging หรือ client contract
- ไม่แก้ `lib/seasonPassTransactions.ts` ในรอบนี้
- ไม่ stage หรือรวม `.obsidian/workspace.json`

สิ่งที่ทำ:

- cleanup readability ใน `app/api/admin/season-pass/plan/route.ts` เฉพาะ `contentApiError` call ที่ยาว
- cleanup readability ใน `app/api/admin/season-pass/rewards/route.ts` เฉพาะ dynamic error response ที่ยาว
- cleanup readability ใน `tests/api/content-season-pass-contracts.test.ts` และ `tests/api/season-pass-route-contracts.test.ts` เฉพาะ request setup ที่ยาว
- ตรวจซ้ำว่า `contentApiError` ใช้เฉพาะ route ที่ contract เป็น `{ error }`
- ตรวจซ้ำว่า `seasonPassApiError` ใช้เฉพาะ route ที่ contract เป็น `{ success: false, message? }`
- ไม่ย้าย logic เพิ่ม และไม่แตะ `lib/seasonPassTransactions.ts`

final audit:

- `app/api/admin/season-pass/plan/route.ts`
  - success ยังเป็น raw plan object
  - error ยังเป็น `{ error }`
  - เหมาะกับ `contentApiError`
- `app/api/admin/season-pass/rewards/route.ts`
  - success ยังเป็น raw reward array
  - error ยังเป็น `{ error }`
  - เหมาะกับ `contentApiError`
- `app/api/admin/season-pass/upload-image/route.ts`
  - success ยังเป็น `{ success: true, url, filename }`
  - error ยังเป็น `{ success: false, message }`
  - เหมาะกับ `seasonPassApiError` เฉพาะ error path
- `app/api/season-pass/purchase/route.ts`
  - success ยัง passthrough จาก `purchaseSeasonPass`
  - error route wrapper ยังเป็น `{ success: false, message }`
  - ไม่ควรย้าย transaction logic ใน phase นี้
- `app/api/season-pass/claim/route.ts`
  - success ยัง passthrough จาก `claimSeasonPass`
  - error route wrapper ยังเป็น `{ success: false, message }`
  - ไม่ควรย้าย claim transaction logic ใน phase นี้

สรุปหลังทำ:

- Step 16.4 ปิด season-pass response helper phase แล้ว
- ยังไม่ควร refactor `lib/seasonPassTransactions.ts` ต่อทันทีใน phase response เพราะเกี่ยวกับเงิน, transaction, claim reward และ audit logging
- ถ้าจะทำต่อ ควรกลับไปเลือก domain ใหม่จาก shared-layer audit หรือทำ final repo-wide response helper audit ก่อน

test หลังทำ:

- ผ่าน: `npx vitest run tests/api/content-season-pass-contracts.test.ts tests/api/season-pass-upload-image-contracts.test.ts tests/api/season-pass-route-contracts.test.ts tests/api/admin-season-pass-plan.test.ts tests/api/season-pass-purchase.test.ts tests/api/season-pass-claim.test.ts tests/lib/seasonPassApiResponse.test.ts tests/lib/contentApiResponse.test.ts` (8 files / 22 tests)
- ผ่าน: `npm test` (128 files / 1468 tests, skipped 6)
- ผ่าน: `npm run lint`

### Step 17.1: Cart checkout client helper

สถานะล่าสุด: เสร็จ 2026-05-14

เป้าหมาย:

- ต่อจาก purchase hook phase โดยเก็บ cart checkout client request/response logic ที่ยังอยู่ใน `components/cart/CartSheet.tsx`
- สร้าง helper ฝั่ง client สำหรับ endpoint `/api/cart/checkout`, payload builder, response parser, และ success label builder ที่เป็น pure ได้
- คง UI flow, confirmation, PIN flow, success modal copy, redirect, cart clearing, sold product removal, และ error copy เดิมทั้งหมด

ไฟล์ที่จะสร้าง:

- `lib/client/cartCheckoutClient.ts`
- `tests/lib/cartCheckoutClient.test.ts`

ไฟล์ที่จะแก้ในรอบนี้:

- `lib/constants/apiRoutes.ts`
- `components/cart/CartSheet.tsx`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- แยกเฉพาะ client helper และ pure label/payload logic ที่ปลอดภัย
- ไม่เปลี่ยน production behavior, endpoint, FormData/JSON contract, response handling, success modal copy, redirect behavior, cart UI behavior, promo behavior, หรือ PIN flow
- ไม่แตะ cart checkout DB transaction logic ใน `app/api/cart/checkout/route.ts`
- ไม่ stage หรือรวม `.obsidian/workspace.json`

test หลังทำ:

- ผ่าน: `npx vitest run tests/lib/cartCheckoutClient.test.ts` (1 file / 5 tests)
- ผ่าน: `npx vitest run tests/lib/cartCheckoutClient.test.ts tests/api/cart-checkout.test.ts` (2 files / 27 tests)
- `npm test` รอบแรกเจอ worker/test timeout กระจายหลายไฟล์นอก scope และไม่มี assertion failure จาก cart helper; rerun ผ่านครบ
- ผ่าน: `npm test` (129 files / 1473 tests, skipped 6)
- ผ่าน: `npm run lint`

สิ่งที่แก้ใน Step 17.1:

- เพิ่ม `API_ROUTES.CART_CHECKOUT` ใน `lib/constants/apiRoutes.ts`
- สร้าง `lib/client/cartCheckoutClient.ts` สำหรับ `buildCartCheckoutPayload`, `parseCartCheckoutResponse`, `checkoutCart`, และ `buildCartCheckoutSuccessLabel`
- สร้าง `tests/lib/cartCheckoutClient.test.ts` เพื่อ lock payload shape, optional field omission, endpoint, response parser, และ success label rules เดิม
- ปรับ `components/cart/CartSheet.tsx` ให้ใช้ helper กลางแทนการเรียก `fetchWithCsrf("/api/cart/checkout", ...)` ตรง ๆ
- ไม่เปลี่ยน UI flow, confirmation, PIN flow, success modal copy, redirect, cart clearing, sold product removal, error copy, หรือ cart checkout DB transaction logic
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 17.2: Cart checkout cleanup and final audit

สถานะล่าสุด: เสร็จ 2026-05-14

เป้าหมาย:

- ปิด phase cart checkout client helper หลัง Step 17.1
- cleanup เฉพาะ import/flow/readability/test naming ใน `components/cart/CartSheet.tsx`, `lib/client/cartCheckoutClient.ts`, และ `tests/lib/cartCheckoutClient.test.ts`
- ยืนยันว่า cart checkout ยังแยกเฉพาะ client request/response/pure helper ไม่แตะ API transaction logic

ไฟล์ที่จะสร้าง:

- ไม่มี

ไฟล์ที่จะแก้ในรอบนี้:

- `components/cart/CartSheet.tsx`
- `lib/client/cartCheckoutClient.ts`
- `tests/lib/cartCheckoutClient.test.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ไม่ย้าย logic เพิ่มถ้าไม่จำเป็น
- ไม่เปลี่ยน production behavior, endpoint, JSON contract, response handling, success modal copy, redirect behavior, cart UI behavior, promo behavior, PIN flow, หรือ sold product removal
- ไม่แตะ cart checkout DB transaction logic ใน `app/api/cart/checkout/route.ts`
- ไม่ stage หรือรวม `.obsidian/workspace.json`

test หลังทำ:

- ผ่าน: `npx vitest run tests/lib/cartCheckoutClient.test.ts tests/api/cart-checkout.test.ts` (2 files / 27 tests)
- `npm test` รอบแรกเจอ timeout/mock pollution ในไฟล์นอก scope; rerun failed subset ผ่าน 5 files / 69 tests, skipped 5
- ผ่าน: `npm test` รอบซ้ำ (129 files / 1473 tests, skipped 6)
- ผ่าน: `npm run lint`

สิ่งที่แก้ใน Step 17.2:

- cleanup `components/cart/CartSheet.tsx` ให้แยก `checkoutPayload` ออกจาก `checkoutCart(...)` เพื่ออ่าน flow ง่ายขึ้น
- ไม่ย้าย logic เพิ่มใน `lib/client/cartCheckoutClient.ts` หรือ `tests/lib/cartCheckoutClient.test.ts` เพราะ helper/test naming ชัดพอแล้ว
- ปิด cart checkout client helper phase นี้ได้แล้ว: component ใช้ shared helper สำหรับ endpoint, payload, response parse, และ success label โดยยังคง confirmation, PIN, modal, redirect, cart clearing, sold product removal, promo, และ UI flow เดิม
- ไม่แตะ `app/api/cart/checkout/route.ts` หรือ DB transaction logic
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 18.1: Promo code validation client helper

สถานะล่าสุด: เสร็จ 2026-05-14

เป้าหมาย:

- แยก client helper สำหรับ validate promo code ที่ใช้ endpoint `/api/promo-codes/validate`
- ให้ `components/ProductActions.tsx` และ `components/cart/CartSheet.tsx` ใช้ helper เดียวกันสำหรับ payload, request/response parse, applied promo mapping และ cart category selection
- คง promo validation behavior, message, price fallback, category rules, silent revalidate, cart promo flow, และ UI copy เดิมทั้งหมด

ไฟล์ที่จะสร้าง:

- `lib/client/promoCodeClient.ts`
- `tests/lib/promoCodeClient.test.ts`

ไฟล์ที่จะแก้ในรอบนี้:

- `components/ProductActions.tsx`
- `components/cart/CartSheet.tsx`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- แยกเฉพาะ client request/response/pure helper ที่ปลอดภัย
- ไม่เปลี่ยน production behavior, endpoint, JSON contract, response handling, validation message, price calculation, promo category behavior, purchase flow, cart checkout flow, หรือ UI behavior
- ไม่แตะ `app/api/promo-codes/validate/route.ts` หรือ promo DB/business logic
- ไม่ stage หรือรวม `.obsidian/workspace.json`

test หลังทำ:

- ผ่าน: `npx vitest run tests/lib/promoCodeClient.test.ts` (1 file / 7 tests)
- ผ่าน: `npx vitest run tests/lib/promoCodeClient.test.ts tests/api/promo-validate.test.ts tests/api/promo-codes.test.ts tests/api/final-coverage-patch-7.test.ts` (4 files / 45 tests)
- ผ่าน: `npm test` (130 files / 1480 tests, skipped 6)
- ผ่าน: `npm run lint`

สิ่งที่แก้ใน Step 18.1:

- สร้าง `lib/client/promoCodeClient.ts` สำหรับ promo validation payload, cart product category selection, applied promo mapping, response parser, และ fetch helper ของ `/api/promo-codes/validate`
- สร้าง `tests/lib/promoCodeClient.test.ts` เพื่อ lock payload shape, null category, non-POINT cart category rules, uppercase promo code, numeric fallback, endpoint, และ response message contract
- ปรับ `components/ProductActions.tsx` ให้ใช้ shared promo helper แทนการ fetch endpoint ตรง ๆ โดยคง silent revalidate, success/error message, final price fallback, และ product category เดิม
- ปรับ `components/cart/CartSheet.tsx` ให้ใช้ shared promo helper แทนการประกอบ categories/payload/fetch ใน component โดยคง cart category behavior, error copy, applied promo, และ checkout flow เดิม
- ไม่แตะ `app/api/promo-codes/validate/route.ts` หรือ promo DB/business logic
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 18.2: Promo code client cleanup and final audit

สถานะล่าสุด: เสร็จ 2026-05-14

เป้าหมาย:

- ปิด phase promo code client helper หลัง Step 18.1
- cleanup เฉพาะ import/flow/readability/test naming ใน `lib/client/promoCodeClient.ts`, `tests/lib/promoCodeClient.test.ts`, `components/ProductActions.tsx`, และ `components/cart/CartSheet.tsx`
- ยืนยันว่า promo validation ยังแยกเฉพาะ client request/response/pure helper ไม่แตะ API route หรือ promo business logic

ไฟล์ที่จะสร้าง:

- ไม่มี

ไฟล์ที่จะแก้ในรอบนี้:

- `lib/client/promoCodeClient.ts`
- `tests/lib/promoCodeClient.test.ts`
- `components/ProductActions.tsx`
- `components/cart/CartSheet.tsx`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ไม่ย้าย logic เพิ่มถ้าไม่จำเป็น
- ไม่เปลี่ยน production behavior, endpoint, JSON contract, response handling, validation message, price calculation, promo category behavior, purchase flow, cart checkout flow, หรือ UI behavior
- ไม่แตะ `app/api/promo-codes/validate/route.ts` หรือ promo DB/business logic
- ไม่ stage หรือรวม `.obsidian/workspace.json`

test หลังทำ:

- ผ่าน: `npx vitest run tests/lib/promoCodeClient.test.ts tests/api/promo-validate.test.ts tests/api/promo-codes.test.ts tests/api/final-coverage-patch-7.test.ts` (4 files / 45 tests)
- ผ่าน: `npm test` (130 files / 1480 tests, skipped 6)
- ผ่าน: `npm run lint`

สิ่งที่แก้ใน Step 18.2:

- cleanup `lib/client/promoCodeClient.ts` ด้วย return type ชัดเจนให้ `getCartPromoProductCategory`
- ไม่ย้าย logic เพิ่มใน `tests/lib/promoCodeClient.test.ts`, `components/ProductActions.tsx`, หรือ `components/cart/CartSheet.tsx` เพราะ flow/helper naming ชัดพอแล้ว
- ปิด promo code client helper phase นี้ได้แล้ว: ProductActions และ CartSheet ใช้ shared helper สำหรับ payload, endpoint, response parse, applied promo mapping, และ cart category selection แล้ว
- ไม่แตะ `app/api/promo-codes/validate/route.ts` หรือ promo DB/business logic
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 19.1: Cart recommendation products client helper

สถานะล่าสุด: เสร็จ 2026-05-14

เป้าหมาย:

- แยก client helper สำหรับโหลดและจัดเรียงสินค้าแนะนำใน cart จาก `components/cart/CartSheet.tsx`
- รวม endpoint `/api/products/list`, response normalization, cart exclusion, sold exclusion, preferred category sorting, discount sorting, featured sorting, และ limit 4 ไว้ใน helper ที่ทดสอบได้
- คง UI behavior, loading behavior, fallback empty state, product card copy/style, AddToCartButton payload, และ recommendation ordering เดิมทั้งหมด

ไฟล์ที่จะสร้าง:

- `lib/client/cartRecommendationsClient.ts`
- `tests/lib/cartRecommendationsClient.test.ts`

ไฟล์ที่จะแก้ในรอบนี้:

- `lib/constants/apiRoutes.ts`
- `components/cart/CartSheet.tsx`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- แยกเฉพาะ client fetch/normalization/filter/sort helper ที่ปลอดภัย
- ไม่เปลี่ยน production behavior, endpoint, response handling, recommendation ordering, cart UI behavior, add-to-cart flow, promo flow, checkout flow, หรือ product card rendering
- ไม่แตะ `app/api/products/list` หรือ product DB/business logic
- ไม่ stage หรือรวม `.obsidian/workspace.json`

test หลังทำ:

- ผ่าน: `npx vitest run tests/lib/cartRecommendationsClient.test.ts tests/lib/cartCheckoutClient.test.ts tests/api/cart-checkout.test.ts` (3 files / 32 tests)
- ผ่าน: `npm test` (131 files / 1485 tests, skipped 6)
- ผ่าน: `npm run lint`

สิ่งที่แก้ใน Step 19.1:

- เพิ่ม `API_ROUTES.PRODUCTS_LIST` ใน `lib/constants/apiRoutes.ts`
- สร้าง `lib/client/cartRecommendationsClient.ts` สำหรับโหลด `/api/products/list`, normalize ราคา, filter สินค้า sold/in-cart, sort preferred category/discount/featured/name และ limit 4
- สร้าง `tests/lib/cartRecommendationsClient.test.ts` เพื่อ lock price normalization, endpoint/cache behavior, unusable response fallback, filtering, และ recommendation ordering เดิม
- ปรับ `components/cart/CartSheet.tsx` ให้ใช้ `fetchCartRecommendationProducts` และ `getFilteredCartRecommendations` แทนการประกอบ fetch/filter/sort ใน component
- ไม่เปลี่ยน UI behavior, loading behavior, fallback empty state, product card copy/style, AddToCartButton payload, promo flow, checkout flow, หรือ product DB/business logic
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 19.2: Cart recommendations cleanup and final audit

สถานะล่าสุด: เสร็จ 2026-05-14

เป้าหมาย:

- ปิด phase cart recommendation helper หลัง Step 19.1
- cleanup เฉพาะ import/flow/readability/test naming ใน `lib/client/cartRecommendationsClient.ts`, `tests/lib/cartRecommendationsClient.test.ts`, และ `components/cart/CartSheet.tsx`
- ยืนยันว่าสินค้าแนะนำใน cart ยังแยกเฉพาะ client fetch/normalization/filter/sort helper ไม่แตะ product API หรือ business logic

ไฟล์ที่จะสร้าง:

- ไม่มี

ไฟล์ที่จะแก้ในรอบนี้:

- `lib/client/cartRecommendationsClient.ts`
- `tests/lib/cartRecommendationsClient.test.ts`
- `components/cart/CartSheet.tsx`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ไม่ย้าย logic เพิ่มถ้าไม่จำเป็น
- ไม่เปลี่ยน production behavior, endpoint, response handling, recommendation ordering, cart UI behavior, add-to-cart flow, promo flow, checkout flow, หรือ product card rendering
- ไม่แตะ `app/api/products/list` หรือ product DB/business logic
- ไม่ stage หรือรวม `.obsidian/workspace.json`

test หลังทำ:

- ผ่าน: `npx vitest run tests/lib/cartRecommendationsClient.test.ts tests/lib/cartCheckoutClient.test.ts tests/api/cart-checkout.test.ts` (3 files / 32 tests)
- ผ่าน: `npm test` (131 files / 1485 tests, skipped 6)
- ผ่าน: `npm run lint`

สิ่งที่แก้ใน Step 19.2:

- cleanup `lib/client/cartRecommendationsClient.ts` ด้วย return type ชัดเจนให้ `getFilteredCartRecommendations` และ `fetchCartRecommendationProducts`
- ไม่ย้าย logic เพิ่มใน `tests/lib/cartRecommendationsClient.test.ts` หรือ `components/cart/CartSheet.tsx` เพราะ helper/test naming และ component flow ชัดพอแล้ว
- ปิด cart recommendation helper phase นี้ได้แล้ว: CartSheet ใช้ shared helper สำหรับ endpoint, normalization, filter, sort, และ limit แล้ว
- ไม่แตะ `app/api/products/list` หรือ product DB/business logic
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 20.1: Account session/profile client helper

สถานะล่าสุด: เสร็จ 2026-05-14

เป้าหมาย:

- แยก client helper สำหรับ request `/api/session` และ `/api/profile` ที่ใช้ซ้ำใน cart/purchase/PIN flow
- ให้ `components/providers/CartContext.tsx`, `lib/require-auth-before-purchase.ts`, `lib/prepare-purchase.ts`, และ `lib/require-pin-for-action.ts` ใช้ helper เดียวกัน
- คง auth fallback, profile response handling, PIN prompt flow, balance check, cart localStorage behavior, และ redirect behavior เดิมทั้งหมด

ไฟล์ที่จะสร้าง:

- `lib/client/accountClient.ts`
- `tests/lib/accountClient.test.ts`

ไฟล์ที่จะแก้ในรอบนี้:

- `lib/constants/apiRoutes.ts`
- `components/providers/CartContext.tsx`
- `lib/require-auth-before-purchase.ts`
- `lib/prepare-purchase.ts`
- `lib/require-pin-for-action.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- แยกเฉพาะ client request/response parser helper ที่ปลอดภัย
- ไม่เปลี่ยน production behavior, endpoint, request init, auth fallback, profile error message, PIN lock handling, purchase balance check, cart sync behavior, localStorage key, หรือ redirect behavior
- ไม่แตะ `app/api/session`, `app/api/profile`, NextAuth, DB, หรือ auth business logic
- ไม่ stage หรือรวม `.obsidian/workspace.json`

test หลังทำ:

- ผ่าน: `npx vitest run tests/lib/accountClient.test.ts tests/api/profile.test.ts tests/api/public-routes.test.ts tests/api/coverage-boost.test.ts tests/api/coverage-boost-3.test.ts` (5 files / 64 tests, skipped 5)
- ผ่าน: `npm test` (132 files / 1488 tests, skipped 6)
- ผ่าน: `npm run lint`

สิ่งที่แก้ใน Step 20.1:

- เพิ่ม `API_ROUTES.SESSION` และ `API_ROUTES.PROFILE` ใน `lib/constants/apiRoutes.ts`
- สร้าง `lib/client/accountClient.ts` สำหรับ `requestSessionStatus` และ `requestProfile` โดยคืนทั้ง `response` และ `data` เพื่อให้ call site คง fallback เดิมได้
- สร้าง `tests/lib/accountClient.test.ts` เพื่อ lock session request init, profile caller-provided init, และ response status passthrough
- ปรับ `components/providers/CartContext.tsx` ให้ sync cart session ผ่าน `requestSessionStatus` โดยคง localStorage/auth fallback เดิม
- ปรับ `lib/require-auth-before-purchase.ts` ให้ใช้ `requestSessionStatus` โดยคง fallback เมื่อ request fail/non-ok เดิม
- ปรับ `lib/prepare-purchase.ts` ให้ใช้ `requestProfile({ init: { cache: "no-store" } })` โดยคง balance/profile error behavior เดิม
- ปรับ `lib/require-pin-for-action.ts` ให้ใช้ `requestProfile` โดยคง PIN prompt/lock/error behavior เดิม
- ไม่แตะ `app/api/session`, `app/api/profile`, NextAuth, DB, หรือ auth business logic
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 20.2: Account client cleanup and final audit

สถานะล่าสุด: เสร็จ 2026-05-14

เป้าหมาย:

- ปิด phase account session/profile client helper หลัง Step 20.1
- cleanup เฉพาะ import/flow/readability/test naming ใน `lib/client/accountClient.ts`, `tests/lib/accountClient.test.ts`, และ call sites ที่ใช้ helper
- ยืนยันว่า helper ยังเป็น request/response parser บาง ๆ และให้แต่ละ call site คง fallback behavior ของตัวเอง

ไฟล์ที่จะสร้าง:

- ไม่มี

ไฟล์ที่จะแก้ในรอบนี้:

- `lib/client/accountClient.ts`
- `tests/lib/accountClient.test.ts`
- `components/providers/CartContext.tsx`
- `lib/require-auth-before-purchase.ts`
- `lib/prepare-purchase.ts`
- `lib/require-pin-for-action.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ไม่ย้าย logic เพิ่มถ้าไม่จำเป็น
- ไม่เปลี่ยน production behavior, endpoint, request init, auth fallback, profile error message, PIN lock handling, purchase balance check, cart sync behavior, localStorage key, หรือ redirect behavior
- ไม่แตะ `app/api/session`, `app/api/profile`, NextAuth, DB, หรือ auth business logic
- ไม่ stage หรือรวม `.obsidian/workspace.json`

test หลังทำ:

- ผ่าน: `npx vitest run tests/lib/accountClient.test.ts tests/api/profile.test.ts tests/api/public-routes.test.ts tests/api/coverage-boost.test.ts tests/api/coverage-boost-3.test.ts` (5 files / 64 tests, skipped 5)
- ผ่าน: `npm test` (132 files / 1488 tests, skipped 6)
- ผ่าน: `npm run lint`

สิ่งที่แก้ใน Step 20.2:

- cleanup `lib/client/accountClient.ts` ด้วย `SESSION_STATUS_REQUEST_INIT` เพื่อให้ session request contract อ่านชัดขึ้นและยังใช้ init เดิม
- ไม่ย้าย logic เพิ่มใน `tests/lib/accountClient.test.ts`, `components/providers/CartContext.tsx`, `lib/require-auth-before-purchase.ts`, `lib/prepare-purchase.ts`, หรือ `lib/require-pin-for-action.ts` เพราะ call site fallback behavior ควรอยู่ที่เดิม
- ปิด account session/profile client helper phase นี้ได้แล้ว: shared helper รวม endpoint/request parsing ส่วน cart/purchase/PIN flow ยังคุม fallback ของตัวเอง
- ไม่แตะ `app/api/session`, `app/api/profile`, NextAuth, DB, หรือ auth business logic
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 21.1: Gacha user balance client helper

สถานะล่าสุด: เสร็จ 2026-05-14

เป้าหมาย:

- แยก client helper สำหรับ refresh user balance จาก endpoint `/api/user/balance`
- ให้ `components/GachaGridMachine.tsx` และ `components/GachaRhombus.tsx` ใช้ helper เดียวกันแทนการ fetch/parse/normalize balance ซ้ำ
- คง behavior เดิมเมื่อ cost type เป็น `FREE`, request fail, response ไม่ ok, `success` เป็น false, หรือ balance field ว่าง

ไฟล์ที่จะสร้าง:

- `lib/client/userBalanceClient.ts`
- `tests/lib/userBalanceClient.test.ts`

ไฟล์ที่จะแก้ในรอบนี้:

- `components/GachaGridMachine.tsx`
- `components/GachaRhombus.tsx`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- แยกเฉพาะ client request/response normalize helper ที่ปลอดภัย
- ไม่เปลี่ยน production behavior, endpoint, cache behavior, gacha roll flow, animation flow, reward display, balance fallback, auth behavior, หรือ error copy
- ไม่แตะ `app/api/user/balance`, gacha roll API, DB, probability, หรือ transaction logic
- ไม่ stage หรือรวม `.obsidian/workspace.json`

test หลังทำ:

- ผ่าน: `npx vitest run tests/lib/userBalanceClient.test.ts tests/lib/gachaLimits.test.ts tests/lib/gachaRewards.test.ts tests/lib/gachaSettings.test.ts tests/api/gacha-routes.test.ts tests/api/gacha-grid-roll.test.ts` (4 files / 22 tests)
- ผ่าน: `npm test` (133 files / 1492 tests, skipped 6)
- ผ่าน: `npm run lint`

สิ่งที่แก้ใน Step 21.1:

- สร้าง `lib/client/userBalanceClient.ts` สำหรับ fetch `/api/user/balance` ด้วย `cache: "no-store"` และ normalize `creditBalance`, `pointBalance`, `ticketBalance`
- สร้าง `tests/lib/userBalanceClient.test.ts` เพื่อ lock missing field fallback, endpoint/cache behavior, non-ok response fallback, และ `success: false` fallback
- ปรับ `components/GachaGridMachine.tsx` ให้ `refreshBalances` ใช้ `fetchUserBalances` โดยคง behavior เดิมเมื่อ cost type เป็น `FREE` หรือ request fail
- ปรับ `components/GachaRhombus.tsx` ให้ `refreshBalances` ใช้ `fetchUserBalances` และลบ import ที่ไม่ใช้แล้ว
- ไม่เปลี่ยน gacha roll flow, animation flow, reward display, auth behavior, error copy, API route, DB, probability, หรือ transaction logic
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 21.2: Gacha user balance client cleanup and final audit

สถานะล่าสุด: เสร็จ 2026-05-14

เป้าหมาย:

- ปิด phase gacha user balance client helper หลัง Step 21.1
- cleanup เฉพาะ import/flow/readability/test naming ใน `lib/client/userBalanceClient.ts`, `tests/lib/userBalanceClient.test.ts`, `components/GachaGridMachine.tsx`, และ `components/GachaRhombus.tsx`
- ยืนยันว่า balance refresh helper ยังเป็น request/normalize helper บาง ๆ และ gacha component ยังคุม fallback ของตัวเอง

ไฟล์ที่จะสร้าง:

- ไม่มี

ไฟล์ที่จะแก้ในรอบนี้:

- `lib/client/userBalanceClient.ts`
- `tests/lib/userBalanceClient.test.ts`
- `components/GachaGridMachine.tsx`
- `components/GachaRhombus.tsx`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ไม่ย้าย logic เพิ่มถ้าไม่จำเป็น
- ไม่เปลี่ยน production behavior, endpoint, cache behavior, gacha roll flow, animation flow, reward display, balance fallback, auth behavior, หรือ error copy
- ไม่แตะ `app/api/user/balance`, gacha roll API, DB, probability, หรือ transaction logic
- ไม่ stage หรือรวม `.obsidian/workspace.json`

test หลังทำ:

- ผ่าน: `npx vitest run tests/lib/userBalanceClient.test.ts tests/lib/gachaLimits.test.ts tests/lib/gachaRewards.test.ts tests/lib/gachaSettings.test.ts tests/api/gacha-routes.test.ts tests/api/gacha-grid-roll.test.ts` (4 files / 22 tests)
- ผ่าน: `npm test` (133 files / 1492 tests, skipped 6)
- ผ่าน: `npm run lint`

สิ่งที่แก้ใน Step 21.2:

- cleanup `lib/client/userBalanceClient.ts` ด้วย `USER_BALANCE_REQUEST_INIT` เพื่อให้ cache contract ของ `/api/user/balance` อ่านชัดขึ้นและยังใช้ init เดิม
- ไม่ย้าย logic เพิ่มใน `tests/lib/userBalanceClient.test.ts`, `components/GachaGridMachine.tsx`, หรือ `components/GachaRhombus.tsx` เพราะ helper/test naming และ component fallback behavior ชัดพอแล้ว
- ปิด gacha user balance client helper phase นี้ได้แล้ว: gacha components ใช้ shared helper สำหรับ endpoint, response fallback, และ balance normalization แล้ว
- ไม่แตะ `app/api/user/balance`, gacha roll API, DB, probability, หรือ transaction logic
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 22.1: Gacha roll client helper

สถานะล่าสุด: เสร็จ 2026-05-15

เป้าหมาย:

- แยก client helper สำหรับเรียก `/api/gacha/roll` จาก `components/GachaRhombus.tsx`
- รวม endpoint, request init, JSON payload, และ response parse fallback ไว้ที่ helper เดียว
- คง classic/rhombus gacha roll flow เดิมทั้งหมด ทั้ง pending spin restore, animation, reward display, auth fallback, และ error copy

ไฟล์ที่จะสร้าง:

- `lib/client/gachaRollClient.ts`
- `tests/lib/gachaRollClient.test.ts`

ไฟล์ที่จะแก้ในรอบนี้:

- `lib/constants/apiRoutes.ts`
- `components/GachaRhombus.tsx`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- แยกเฉพาะ client request/response parse helper ที่ปลอดภัย
- ไม่เปลี่ยน production behavior, endpoint, request body, fallback message, gacha roll flow, animation flow, reward display, auth behavior, หรือ error copy
- ไม่แตะ `app/api/gacha/roll`, grid roll API, DB, probability, daily limit, pending spin state, หรือ transaction logic
- ไม่ stage หรือรวม `.obsidian/workspace.json`

test หลังทำ:

- ผ่าน: `npx vitest run tests/lib/gachaRollClient.test.ts tests/lib/userBalanceClient.test.ts tests/lib/gachaLimits.test.ts tests/lib/gachaRewards.test.ts tests/lib/gachaSettings.test.ts tests/lib/gachaUsers.test.ts tests/lib/gachaGrid.test.ts` (7 files / 60 tests)
- ผ่าน: `npm test` (134 files / 1498 tests, skipped 6)
- ผ่าน: `npm run lint`

สิ่งที่แก้ใน Step 22.1:

- เพิ่ม `API_ROUTES.GACHA_ROLL` เพื่อรวม endpoint `/api/gacha/roll` ไว้ใน shared constants
- สร้าง `lib/client/gachaRollClient.ts` สำหรับ build payload, POST request, และ parse response fallback เดิมของ classic/rhombus gacha roll
- สร้าง `tests/lib/gachaRollClient.test.ts` เพื่อ lock payload shape, endpoint/request init, response passthrough, 401 fallback `"กรุณาเข้าสู่ระบบก่อน"`, และ generic fallback `"เกิดข้อผิดพลาด"`
- ปรับ `components/GachaRhombus.tsx` ให้ `callRollApi` ใช้ `requestGachaRoll(buildGachaRollPayload(...))` แทน fetch ตรง โดยคง pending spin restore, animation, reward display, และ error handling ของ component เดิม
- ไม่แตะ `app/api/gacha/roll`, grid roll API, DB, probability, daily limit, pending spin state, หรือ transaction logic
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 22.2: Gacha roll client cleanup and final audit

สถานะล่าสุด: เสร็จ 2026-05-15

เป้าหมาย:

- ปิด phase gacha roll client helper หลัง Step 22.1
- audit ว่ายังมี client-side direct fetch ไป `/api/gacha/roll` ที่ควรใช้ helper หรือไม่
- cleanup เฉพาะ import/flow/readability/test naming ใน helper, test, และ `components/GachaRhombus.tsx` ถ้าจำเป็น

ไฟล์ที่จะสร้าง:

- ไม่มี

ไฟล์ที่จะแก้ในรอบนี้:

- `lib/client/gachaRollClient.ts`
- `tests/lib/gachaRollClient.test.ts`
- `components/GachaRhombus.tsx`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ไม่ย้าย logic เพิ่มถ้าไม่จำเป็น
- ไม่เปลี่ยน production behavior, endpoint, request body, fallback message, gacha roll flow, animation flow, reward display, auth behavior, หรือ error copy
- ไม่แตะ `app/api/gacha/roll`, grid roll API, DB, probability, daily limit, pending spin state, หรือ transaction logic
- ไม่ stage หรือรวม `.obsidian/workspace.json`

test หลังทำ:

- ผ่าน: `npx vitest run tests/lib/gachaRollClient.test.ts tests/lib/userBalanceClient.test.ts tests/lib/gachaLimits.test.ts tests/lib/gachaRewards.test.ts tests/lib/gachaSettings.test.ts tests/lib/gachaUsers.test.ts tests/lib/gachaGrid.test.ts` (7 files / 60 tests)
- ผ่าน: `npm test` (134 files / 1499 tests, skipped 6)
- ผ่าน: `npm run lint`

สิ่งที่แก้ใน Step 22.2:

- audit direct client usage ด้วย `rg` แล้วไม่พบ `fetch("/api/gacha/roll")` หรือ direct fetch ไป gacha roll endpoint เหลือใน `components`, `app`, `lib`, หรือ `tests`
- ยืนยันว่า classic/rhombus gacha roll client call site ใช้ `requestGachaRoll(buildGachaRollPayload(...))` แล้ว
- ไม่แก้ production/test code เพิ่ม เพราะ helper, test naming, import, และ flow อ่านชัดพอหลัง Step 22.1
- ปิด gacha roll client helper phase นี้ได้แล้ว: endpoint, payload build, POST request, และ JSON parse fallback อยู่ใน shared helper แล้ว
- ไม่แตะ `app/api/gacha/roll`, grid roll API, DB, probability, daily limit, pending spin state, หรือ transaction logic
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 23.1: Gacha grid client helper

สถานะล่าสุด: เสร็จ 2026-05-15

เป้าหมาย:

- แยก client helper สำหรับ `components/GachaGridMachine.tsx` ที่เรียก `/api/gacha/grid/rewards` และ `/api/gacha/grid/roll`
- รวม endpoint, rewards URL build, rewards padding, roll payload, POST request, และ response parsing ไว้ใน helper ที่บางและ test ได้
- คง grid gacha flow เดิมทั้งหมด ทั้ง rewards fallback, animation, skip animation, reward display, auth fallback, และ error copy

ไฟล์ที่จะสร้าง:

- `lib/client/gachaGridClient.ts`
- `tests/lib/gachaGridClient.test.ts`

ไฟล์ที่จะแก้ในรอบนี้:

- `components/GachaGridMachine.tsx`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- แยกเฉพาะ client request/response/data-shaping helper ที่ปลอดภัย
- ไม่เปลี่ยน production behavior, endpoint, request body, fallback message, grid gacha roll flow, animation flow, reward display, auth behavior, หรือ error copy
- ไม่แตะ `app/api/gacha/grid/rewards`, `app/api/gacha/grid/roll`, classic gacha roll API, DB, probability, daily limit, pending spin state, หรือ transaction logic
- ไม่ stage หรือรวม `.obsidian/workspace.json`

test หลังทำ:

- ผ่าน: `npx vitest run tests/lib/gachaGridClient.test.ts tests/lib/gachaRollClient.test.ts tests/lib/userBalanceClient.test.ts tests/lib/gachaLimits.test.ts tests/lib/gachaRewards.test.ts tests/lib/gachaSettings.test.ts tests/lib/gachaUsers.test.ts tests/lib/gachaGrid.test.ts` (8 files / 67 tests)
- ผ่าน: `npm test` (135 files / 1506 tests, skipped 6)
- ผ่าน: `npm run lint`

สิ่งที่แก้ใน Step 23.1:

- สร้าง `lib/client/gachaGridClient.ts` สำหรับ rewards URL build, rewards padding, grid roll payload, rewards fetch, และ grid roll POST request
- สร้าง `tests/lib/gachaGridClient.test.ts` เพื่อ lock endpoint, padding 9 ช่อง, request body `{ machineId: machineId ?? null }`, และ POST request init เดิม
- ปรับ `components/GachaGridMachine.tsx` ให้ใช้ `fetchGachaGridRewards`, `getPaddedGridRewards`, `buildGachaGridRollPayload`, และ `requestGachaGridRoll` แทน fetch ตรง
- คง state/animation/reward display/error handling อยู่ใน component เดิม เพื่อไม่เปลี่ยน grid gacha flow หรือ error copy
- audit ด้วย `rg` แล้ว direct component fetch ไป grid rewards/roll ถูกย้ายออก เหลือเฉพาะ route tests/API comments ที่ตั้งใจไว้
- ไม่แตะ `app/api/gacha/grid/rewards`, `app/api/gacha/grid/roll`, classic gacha roll API, DB, probability, daily limit, pending spin state, หรือ transaction logic
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 23.2: Gacha grid client cleanup and final audit

สถานะล่าสุด: เสร็จ 2026-05-19

เป้าหมาย:

- ปิด phase gacha grid client helper หลัง Step 23.1
- audit ว่ายังมี client-side direct fetch ไป `/api/gacha/grid/rewards` หรือ `/api/gacha/grid/roll` ที่ควรใช้ helper หรือไม่
- cleanup เฉพาะ import/flow/readability/test naming ใน helper, test, และ `components/GachaGridMachine.tsx` ถ้าจำเป็น

ไฟล์ที่จะสร้าง:

- ไม่มี

ไฟล์ที่จะแก้ในรอบนี้:

- `lib/client/gachaGridClient.ts`
- `tests/lib/gachaGridClient.test.ts`
- `components/GachaGridMachine.tsx`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ไม่ย้าย logic เพิ่มถ้าไม่จำเป็น
- ไม่เปลี่ยน production behavior, endpoint, request body, fallback message, grid gacha roll flow, animation flow, reward display, auth behavior, หรือ error copy
- ไม่แตะ `app/api/gacha/grid/rewards`, `app/api/gacha/grid/roll`, classic gacha roll API, DB, probability, daily limit, pending spin state, หรือ transaction logic
- ไม่ stage หรือรวม `.obsidian/workspace.json`

test หลังทำ:

- ผ่าน: `npx vitest run tests/lib/gachaGridClient.test.ts tests/lib/gachaRollClient.test.ts tests/lib/userBalanceClient.test.ts tests/lib/gachaLimits.test.ts tests/lib/gachaRewards.test.ts tests/lib/gachaSettings.test.ts tests/lib/gachaUsers.test.ts tests/lib/gachaGrid.test.ts` (8 files / 67 tests)
- ผ่าน: `npm test` (140 files / 1520 tests, skipped 6)
- ผ่าน: `npm run lint`

สิ่งที่แก้ใน Step 23.2:

- audit direct client usage ด้วย `rg` แล้วไม่พบ direct client fetch ไป `/api/gacha/grid/rewards` หรือ `/api/gacha/grid/roll` เหลือใน `components` หรือ `lib`
- ยืนยันว่า `components/GachaGridMachine.tsx` ใช้ `fetchGachaGridRewards`, `getPaddedGridRewards`, `buildGachaGridRollPayload`, และ `requestGachaGridRoll` แล้ว
- ไม่แก้ production/test code เพิ่ม เพราะ helper, test naming, import, และ flow อ่านชัดพอหลัง Step 23.1
- ปิด gacha grid client helper phase นี้ได้แล้ว: rewards URL build, rewards padding, roll payload, rewards fetch, และ grid roll POST request อยู่ใน shared helper แล้ว
- ไม่แตะ `app/api/gacha/grid/rewards`, `app/api/gacha/grid/roll`, classic gacha roll API, DB, probability, daily limit, pending spin state, หรือ transaction logic
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 24.1: Gacha activity client helper

สถานะล่าสุด: เสร็จ 2026-05-20

เป้าหมาย:

- แยก client helper สำหรับ `components/GachaRecentFeed.tsx` และ `components/GachaHistory.tsx` ที่เรียก `/api/gacha/recent` และ `/api/gacha/history`
- รวม endpoint constants, fetch helpers, และ response parsing fallback แบบบาง ๆ ไว้ใน `lib/client`
- คง loading state, empty state, silent failure, Thai copy, image display, time formatting, และ stats rendering เดิมทั้งหมด

ไฟล์ที่จะสร้าง:

- `lib/client/gachaActivityClient.ts`
- `tests/lib/gachaActivityClient.test.ts`

ไฟล์ที่จะแก้ในรอบนี้:

- `lib/constants/apiRoutes.ts`
- `components/GachaRecentFeed.tsx`
- `components/GachaHistory.tsx`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- แยกเฉพาะ client request/response helper ที่ปลอดภัย
- ไม่เปลี่ยน production behavior, endpoint, response handling, loading behavior, empty state, animation, stats display, Thai copy, หรือ error handling
- ไม่แตะ `app/api/gacha/recent`, `app/api/gacha/history`, DB, reward mapping, probability, daily limit, หรือ transaction logic
- ไม่ stage หรือรวม `.obsidian/workspace.json`

test หลังทำ:

- ผ่าน: `npx vitest run tests/lib/gachaActivityClient.test.ts tests/api/new-code-routes.test.ts tests/lib/utils-coverage.test.ts tests/api/final-coverage-patch.test.ts tests/api/final-coverage-patch-6.test.ts tests/api/final-coverage-patch-7.test.ts` (6 files / 138 tests)
- ผ่าน: `npm test` (141 files / 1531 tests, skipped 6)
- ผ่าน: `npm run lint`

สิ่งที่แก้ใน Step 24.1:

- เพิ่ม `API_ROUTES.GACHA_RECENT` และ `API_ROUTES.GACHA_HISTORY` ใน `lib/constants/apiRoutes.ts`
- สร้าง `lib/client/gachaActivityClient.ts` สำหรับ fetch `/api/gacha/recent` และ `/api/gacha/history` พร้อม type ของ recent logs, history logs, และ stats
- สร้าง `tests/lib/gachaActivityClient.test.ts` เพื่อ lock endpoint, recent non-ok thrown error, history non-ok silent null fallback, และ response passthrough เดิม
- ปรับ `components/GachaRecentFeed.tsx` ให้ใช้ `fetchGachaRecentActivity` แทน fetch ตรง โดยคง mounted guard, loading state, empty state, animation, Thai copy, และ image display เดิม
- ปรับ `components/GachaHistory.tsx` ให้ใช้ `fetchGachaHistoryActivity` แทน fetch ตรง โดยคง silent failure, loading state, empty state, stats display, time formatting, และ Thai copy เดิม
- ไม่แตะ `app/api/gacha/recent`, `app/api/gacha/history`, DB, reward mapping, probability, daily limit, หรือ transaction logic
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 24.2: Gacha activity client cleanup and final audit

สถานะล่าสุด: เสร็จ 2026-05-20

เป้าหมาย:

- ปิด phase gacha activity client helper หลัง Step 24.1
- audit ว่ายังมี client-side direct fetch ไป `/api/gacha/recent` หรือ `/api/gacha/history` ที่ควรใช้ helper หรือไม่
- cleanup เฉพาะ import/flow/readability/test naming ใน helper, test, และ gacha activity components ถ้าจำเป็น

ไฟล์ที่จะสร้าง:

- ไม่มี

ไฟล์ที่จะแก้ในรอบนี้:

- `lib/client/gachaActivityClient.ts`
- `tests/lib/gachaActivityClient.test.ts`
- `components/GachaRecentFeed.tsx`
- `components/GachaHistory.tsx`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ไม่ย้าย logic เพิ่มถ้าไม่จำเป็น
- ไม่เปลี่ยน production behavior, endpoint, response handling, loading behavior, empty state, animation, stats display, Thai copy, หรือ error handling
- ไม่แตะ `app/api/gacha/recent`, `app/api/gacha/history`, DB, reward mapping, probability, daily limit, หรือ transaction logic
- ไม่ stage หรือรวม `.obsidian/workspace.json`

test หลังทำ:

- ผ่าน: `npx vitest run tests/lib/gachaActivityClient.test.ts tests/api/new-code-routes.test.ts tests/lib/utils-coverage.test.ts tests/api/final-coverage-patch.test.ts tests/api/final-coverage-patch-6.test.ts tests/api/final-coverage-patch-7.test.ts` (6 files / 138 tests)
- ผ่าน: `npm test` (141 files / 1531 tests, skipped 6)
- ผ่าน: `npm run lint`

สิ่งที่แก้ใน Step 24.2:

- audit direct client usage ด้วย `rg` แล้วไม่พบ direct client fetch ไป `/api/gacha/recent` หรือ `/api/gacha/history` เหลือใน `components`, `app`, `lib`, หรือ `tests`
- ยืนยันว่า `components/GachaRecentFeed.tsx` ใช้ `fetchGachaRecentActivity` แล้ว
- ยืนยันว่า `components/GachaHistory.tsx` ใช้ `fetchGachaHistoryActivity` แล้ว
- ไม่แก้ production/test code เพิ่ม เพราะ helper, test naming, import, และ flow อ่านชัดพอหลัง Step 24.1
- ปิด gacha activity client helper phase นี้ได้แล้ว: recent/history endpoint constants, fetch helpers, response passthrough, และ fallback behavior อยู่ใน shared helper แล้ว
- ไม่แตะ `app/api/gacha/recent`, `app/api/gacha/history`, DB, reward mapping, probability, daily limit, หรือ transaction logic
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 25.1: Product stock duplicate user helper

สถานะล่าสุด: เสร็จ 2026-05-20

เป้าหมาย:

- รวม duplicate stock username validation ที่ใช้ใน product create/update/stock API ให้เป็น helper กลางของ product feature
- คง behavior เดิมของ response status/message เมื่อพบ username ซ้ำใน stock เดียวกันหรือซ้ำกับสินค้าอื่น
- ลด loop/decrypt/collision logic ซ้ำใน route โดยไม่เปลี่ยน product payload, audit log, cache invalidation, หรือ stock update behavior

ไฟล์ที่จะสร้าง:

- `lib/features/products/stockValidation.ts`
- `tests/lib/productStockValidation.test.ts`

ไฟล์ที่จะแก้ในรอบนี้:

- `app/api/products/route.ts`
- `app/api/products/[id]/route.ts`
- `app/api/products/[id]/stock/route.ts`
- `lib/features/products/queries.ts`
- `lib/stock.ts`
- `tests/api/products.test.ts`
- `tests/lib/stock.test.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ย้ายเฉพาะ duplicate stock username validation
- ไม่เปลี่ยน production behavior, response shape, response message/status, auth/CSRF checks, audit log, cache invalidation, product mutation, stock separator handling, encryption/decryption behavior, หรือ stock count behavior
- ไม่แตะ UI validation, DB schema, migration, purchase flow, order flow, หรือ gacha flow
- ไม่ stage หรือรวม `.obsidian/workspace.json`

test หลังทำ:

- ผ่าน: `npx vitest run tests/lib/productStockValidation.test.ts tests/lib/stock.test.ts tests/api/products.test.ts tests/api/product-stock-separator.test.ts tests/api/coverage-boost.test.ts tests/api/admin-settings-products.test.ts tests/api/products-id.test.ts tests/api/products-users-success.test.ts` (8 files / 109 tests, skipped 5)
- ผ่าน: `npm test` (142 files / 1536 tests, skipped 6)
- ผ่าน: `npm run lint`

สิ่งที่แก้ใน Step 25.1:

- สร้าง `lib/features/products/stockValidation.ts` เพื่อรวม duplicate username validation สำหรับ stock เดียวกันและ cross-product stock collision
- สร้าง `tests/lib/productStockValidation.test.ts` เพื่อ lock duplicate conflict, empty stock no-op, cross-product conflict, undecryptable product skip, และ response message formatting
- ปรับ `app/api/products/route.ts`, `app/api/products/[id]/route.ts`, และ `app/api/products/[id]/stock/route.ts` ให้ใช้ `findProductStockUserConflict` และ `productStockUserConflictResponseMessage` แทน loop/response message ที่ซ้ำใน route
- คง `lib/stock.ts` helper สำหรับ extract username และ duplicate detection ใน stock เดียวกัน พร้อม test ใน `tests/lib/stock.test.ts`
- คง `lib/features/products/queries.ts` helper สำหรับโหลด product stock list ที่ route ต้องใช้
- ไม่เปลี่ยน production behavior, response shape, response message/status, auth/CSRF checks, audit log, cache invalidation, product mutation, stock separator handling, encryption/decryption behavior, หรือ stock count behavior
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 25.2: Product stock duplicate helper cleanup and final audit

สถานะล่าสุด: เสร็จ 2026-05-20

เป้าหมาย:

- ปิด phase product stock duplicate helper หลัง Step 25.1
- audit ว่ายังมี duplicate username validation loop ใน product create/update/stock API ที่ควรใช้ helper กลางหรือไม่
- cleanup เฉพาะ import/flow/readability/test naming ใน helper, routes, และ tests ถ้าจำเป็น

ไฟล์ที่จะสร้าง:

- ไม่มี

ไฟล์ที่จะแก้ในรอบนี้:

- `lib/features/products/stockValidation.ts`
- `tests/lib/productStockValidation.test.ts`
- `app/api/products/route.ts`
- `app/api/products/[id]/route.ts`
- `app/api/products/[id]/stock/route.ts`
- `lib/features/products/queries.ts`
- `lib/stock.ts`
- `tests/api/products.test.ts`
- `tests/lib/stock.test.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ไม่ย้าย logic เพิ่มถ้าไม่จำเป็น
- ไม่เปลี่ยน production behavior, response shape, response message/status, auth/CSRF checks, audit log, cache invalidation, product mutation, stock separator handling, encryption/decryption behavior, หรือ stock count behavior
- ไม่แตะ UI validation, DB schema, migration, purchase flow, order flow, หรือ gacha flow
- ไม่ stage หรือรวม `.obsidian/workspace.json`

test หลังทำ:

- ผ่าน: `npx vitest run tests/lib/productStockValidation.test.ts tests/lib/stock.test.ts tests/api/products.test.ts tests/api/product-stock-separator.test.ts tests/api/coverage-boost.test.ts tests/api/admin-settings-products.test.ts tests/api/products-id.test.ts tests/api/products-users-success.test.ts` (8 files / 109 tests, skipped 5)
- ผ่าน: `npm test` (142 files / 1536 tests, skipped 6)
- ผ่าน: `npm run lint`

สิ่งที่ตรวจใน Step 25.2:

- audit ด้วย `rg` แล้วไม่พบ duplicate username validation path ที่เหลือใน product create/update/stock routes ที่ควรย้ายเพิ่ม
- ยืนยันว่า `app/api/products/route.ts`, `app/api/products/[id]/route.ts`, และ `app/api/products/[id]/stock/route.ts` ใช้ `findProductStockUserConflict` และ `productStockUserConflictResponseMessage` แล้ว
- ยืนยันว่า loop ที่ยังอยู่ใน `GET /api/products/[id]/stock` เป็นการสร้าง `takenUsers` map สำหรับ UI ไม่ใช่ validation/response path เดียวกับ Step 25.1 จึงไม่ย้ายในรอบนี้
- ไม่แก้ production/test code เพิ่ม เพราะ helper, test naming, import, และ flow อ่านชัดพอหลัง Step 25.1
- ปิด product stock duplicate helper phase นี้ได้แล้ว: duplicate username validation ใน stock เดียวกันและ cross-product stock collision อยู่ใน shared helper แล้ว
- ไม่เปลี่ยน production behavior, response shape, response message/status, auth/CSRF checks, audit log, cache invalidation, product mutation, stock separator handling, encryption/decryption behavior, หรือ stock count behavior
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 26.1: Product stock taken-users helper and create route

สถานะล่าสุด: เสร็จ 2026-05-20

เป้าหมาย:

- เพิ่ม shared helper สำหรับสร้าง `takenUsers` map จาก encrypted product stock เพื่อใช้ซ้ำใน product stock UI/API
- เพิ่ม `GET /api/products/new/stock` สำหรับ create product flow ที่ต้องตรวจ user ซ้ำกับสินค้าทั้งหมด
- ปรับ `GET /api/products/[id]/stock` ให้ใช้ helper กลางแทน loop local โดยคง response shape `{ success: true, takenUsers }`

ไฟล์ที่จะสร้าง:

- `app/api/products/new/stock/route.ts`
- `tests/lib/productStockTakenUsers.test.ts`

ไฟล์ที่จะแก้ในรอบนี้:

- `app/api/products/[id]/stock/route.ts`
- `lib/features/products/stockValidation.ts`
- `tests/api/product-stock-taken-users.test.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ทำเฉพาะ taken-users map/read-only route สำหรับ stock duplicate UI
- ไม่เปลี่ยน product create/update/stock mutation behavior, response message/status ของ mutation, auth/CSRF checks ของ mutation, audit log, cache invalidation, encryption/decryption behavior, stock separator handling, หรือ stock count behavior
- ไม่แตะ DB schema, migration, purchase flow, order flow, หรือ gacha flow
- ไม่ stage หรือรวม `.obsidian/workspace.json`

test หลังทำ:

- ผ่าน: `npx vitest run tests/lib/productStockTakenUsers.test.ts tests/lib/productStockValidation.test.ts tests/api/product-stock-taken-users.test.ts tests/api/product-stock-separator.test.ts tests/api/coverage-boost.test.ts tests/api/products.test.ts` (6 files / 47 tests, skipped 5)
- ผ่าน: `npm test` (144 files / 1543 tests, skipped 6)
- ผ่าน: `npm run lint`

สิ่งที่แก้ใน Step 26.1:

- เพิ่ม `buildProductStockTakenUsers` ใน `lib/features/products/stockValidation.ts` เพื่อสร้าง `takenUsers` map จาก encrypted stock และ skip stock ที่ decrypt ไม่ได้ตาม behavior เดิม
- ปรับ `GET /api/products/[id]/stock` ให้ใช้ `buildProductStockTakenUsers` โดยคง response shape `{ success: true, takenUsers }` และ auth/error shape เดิม
- เพิ่ม `GET /api/products/new/stock` สำหรับ create product flow ที่คืน `{ success: true, takenUsers }` และใช้ `PERMISSIONS.PRODUCT_CREATE`
- เพิ่ม `tests/lib/productStockTakenUsers.test.ts` เพื่อ lock map building, empty/undecryptable skip, และ duplicate user overwrite ตาม scan order เดิม
- เพิ่ม `tests/api/product-stock-taken-users.test.ts` เพื่อ guard existing product stock page response, unauthorized shape, create product stock endpoint, และ unauthorized create endpoint
- focused test รอบแรก fail เฉพาะ fixture ใหม่ที่ใช้ separator ที่ไม่มีใน `lib/stock.ts`; แก้ test fixture ให้ตรง behavior จริงโดยไม่แตะ production code
- ไม่เปลี่ยน product create/update/stock mutation behavior, response message/status ของ mutation, auth/CSRF checks ของ mutation, audit log, cache invalidation, encryption/decryption behavior, stock separator handling, หรือ stock count behavior
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 27: Practical closure

สถานะล่าสุด: เสร็จ 2026-05-20

เป้าหมาย:

- ปิด shared-layer audit แบบ practical หลังทำมาหลายวัน
- แยกสิ่งที่ "ควรหยุด" ออกจากสิ่งที่ยังเป็น backlog ระยะยาว
- ระบุเกณฑ์ว่าถ้าจะทำต่อควรเปิดเป็นงานใหม่พร้อม requirement เฉพาะ ไม่ต่อ audit แบบ open-ended

ไฟล์ที่จะสร้าง:

- ไม่มี

ไฟล์ที่แก้ในรอบนี้:

- `docs/planning/shared-layer-audit.md`

ผลสรุป practical closure:

- ปิด audit นี้ได้แล้วในเชิง practical เพราะ phase ที่ความเสี่ยงต่ำถึงกลางถูกทำและ verify แล้วหลายกลุ่ม:
  - shared constants/formatter/pricing
  - purchase/cart/promo/account/gacha client helpers
  - upload/admin gacha/content/settings/season-pass response helper guards
  - topup/gacha/dashboard/admin export helper extraction บางส่วน
  - product stock duplicate/taken-users helper และ route guard ล่าสุด
- ไม่ควรทำ refactor ต่อแบบอัตโนมัติจากเอกสารนี้ เพราะรายการที่เหลือเป็นงานที่อาจแตะธุรกรรม, เงิน, stock/order mutation, response contract public/admin, หรือ route ใหญ่ที่ต้องมี requirement และ guard test เฉพาะ
- historical notes ที่ยังพูดว่า "ควรทำต่อ" หรือ "เริ่มทำ" ในส่วนเก่าไม่ถือเป็น active next step หลัง practical closure นี้ เว้นแต่มี requirement ใหม่อ้างอิงกลับไป
- `.obsidian/workspace.json` ยังเป็น local workspace state ที่ไม่ควร stage

backlog ที่ยังเปิดได้ภายหลัง แต่ไม่อยู่ใน practical closure:

- transaction/service extraction ของ purchase/order/topup/gacha/season-pass เฉพาะเมื่อมี requirement ชัด
- response contract migration ขนาดใหญ่ เฉพาะเมื่อมี consumer guard ครบและยอมรับ shape change ได้
- UI validation consolidation ของ product stock/create/edit เฉพาะถ้าจะทำ UX pass แยก
- API route cleanup ขนาดใหญ่ เฉพาะเป็น domain-by-domain task พร้อม focused tests

test หลังปิด:

- ผ่าน: `npm run check:encoding`
- ผ่าน: `npm test` (144 files / 1543 tests, skipped 6)
- ผ่าน: `npm run lint`

### Step 1: Shared constants และ formatter

สถานะล่าสุด: ทำรอบแรก 2026-05-07

เป้าหมาย:

- รวมค่าคงที่ที่ใช้ซ้ำ เช่น API route, storage key, gacha tier
- รวม formatter ที่ใช้ซ้ำ เช่น currency, Thai date, MySQL datetime

ไฟล์ที่จะสร้าง:

- `lib/constants/apiRoutes.ts`
- `lib/constants/storageKeys.ts`
- `lib/constants/gacha.ts`
- `lib/formatters/currency.ts`
- `lib/formatters/date.ts`

ไฟล์ที่จะแก้ในรอบนี้:

- `lib/utils/date.ts`
- `lib/csrf-client.ts`
- `hooks/useCsrfToken.ts`
- `lib/features/promo/shared.ts`
- `lib/gachaGrid.ts`
- `lib/emailVerification.ts`
- `app/api/dashboard/overview/route.ts`
- `app/api/dashboard/purchases/route.ts`
- `app/api/dashboard/topup-summary/route.ts`
- `app/api/gacha/history/route.ts`
- `app/api/gacha/roll/route.ts`
- `app/api/gacha/grid/roll/route.ts`
- `app/admin/news/page.tsx`
- `app/admin/popups/page.tsx`
- `app/admin/settings/page.tsx`
- `components/GachaGridMachine.tsx`
- `components/GachaRhombus.tsx`
- `components/admin/ProductImageGalleryField.tsx`
- `components/BuyButton.tsx`
- `components/FeaturedProducts.tsx`
- `components/ProductActions.tsx`
- `components/ProductCard.tsx`
- `components/SaleProducts.tsx`
- `app/admin/users/AdminUsersClient.tsx`
- `app/dashboard/topup/page.tsx`
- `components/admin/RevenueAreaChart.tsx`
- `components/LiveDateTime.tsx`
- `components/DashboardClient.tsx`
- `lib/seasonPass.ts`
- `lib/seasonPassTransactions.ts`

ข้อจำกัดของรอบนี้:

- ไม่เปลี่ยน API response shape
- ไม่ย้าย business logic ใหญ่
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- เปลี่ยนเฉพาะค่าคงที่/formatter ที่พฤติกรรมเท่าเดิม

ผลตรวจล่าสุด:

- `npm run lint` ผ่าน
- `npm test` ยังไม่ผ่านจาก test suite เดิมหลายจุด เช่น mock ของ `@/lib/auth` ไม่มี `requirePermission`, mock ของ `@/lib/csrf` ไม่มี `validateCsrfRequest`, assertion เก่าใน `tests/lib/cache.test.ts` และ `tests/lib/userActions.test.ts`
- failure ที่เห็นไม่ได้ชี้ไปที่ไฟล์ constants/formatters ที่เพิ่มใน Step 1 โดยตรง

สิ่งใหม่ที่จะเพิ่ม:

- `lib/constants/apiRoutes.ts`
- `lib/constants/storageKeys.ts`
- `lib/constants/gacha.ts`
- `lib/formatters/currency.ts`
- `lib/formatters/date.ts` หรือขยาย `lib/utils/date.ts`

skill/pattern ที่ใช้:

- ใช้ TypeScript `as const` เพื่อให้ endpoint และ storage key type-safe
- ใช้ pure function สำหรับ formatter เพื่อ test ง่าย
- หลีกเลี่ยงการเปลี่ยน response shape หรือ behavior ใน step นี้

ไฟล์ที่น่าจะถูกแก้:

- component/page ที่มี string ซ้ำ เช่น `/api/purchase`, `/api/upload`, `gacha-skip-animation`
- helper วันที่ใน `lib/utils/date.ts`

test หลังทำ:

- `npm test`
- `npm run lint`

### Step 2: Product pricing และ discount helper

สถานะล่าสุด: เสร็จแล้ว 2026-05-07

เป้าหมาย:

- รวม logic ส่วนลดสินค้าที่ซ้ำในหน้า create/edit
- แยก logic เงินออกจาก component ให้ test ได้

ไฟล์ที่จะสร้าง:

- `lib/features/products/pricing.ts`
- `tests/lib/productPricing.test.ts`

ไฟล์ที่จะแก้ในรอบนี้:

- `app/admin/products/new/page.tsx`
- `app/admin/products/[id]/edit/page.tsx`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ไม่เปลี่ยน API response shape
- ไม่เปลี่ยน UI flow ของหน้า create/edit
- ไม่แตะ auto-delete helper ในหน้า edit
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- ย้ายเฉพาะ pure helper ที่เกี่ยวกับราคา/ส่วนลดและเพิ่ม unit test

สิ่งใหม่ที่จะเพิ่ม:

- `lib/features/products/pricing.ts`
- test สำหรับ pricing helper ใน `tests/lib` หรือ path test ที่ repo ใช้อยู่

skill/pattern ที่ใช้:

- ใช้ pure function สำหรับ logic เงิน
- ระวัง decimal/string จาก DB
- ไม่เปลี่ยน UI flow พร้อมกัน ถ้าไม่จำเป็น

ไฟล์ที่น่าจะถูกแก้:

- `app/admin/products/new/page.tsx`
- `app/admin/products/[id]/edit/page.tsx`

test หลังทำ:

- unit test pricing helper
- `npm test`
- `npm run lint`

ผลตรวจล่าสุด:

- `npx vitest run tests/lib/productPricing.test.ts` ผ่าน 1 ไฟล์ / 9 tests
- `npm run lint` ผ่าน
- `npm test` ยังไม่ผ่านจาก test suite เดิมหลายจุด เช่น mock ของ `@/lib/auth` ไม่มี `requirePermission`, mock ของ `@/lib/csrf` ไม่มี `validateCsrfRequest`, assertion เก่าใน `tests/lib/cache.test.ts`, `tests/lib/userActions.test.ts`, และ `tests/components/announcement-popup.test.tsx`
- failure ที่เห็นไม่ได้ชี้ไปที่ `lib/features/products/pricing.ts` หรือ test pricing helper ที่เพิ่มใน Step 2 โดยตรง
- `git diff --check` ไม่พบ whitespace error แต่มี warning เรื่อง line ending และ `.obsidian/workspace.json` ยังเป็น local workspace state ที่ไม่ควร stage

### Step 3: Purchase flow กลาง

สถานะล่าสุด: เสร็จแล้ว 2026-05-07

เป้าหมาย:

- ลด flow ซื้อสินค้าซ้ำใน component หลายตัว
- ทำให้ success modal, error handling, redirect หลังซื้อสำเร็จเหมือนกัน

สิ่งใหม่ที่จะเพิ่ม:

- `hooks/usePurchaseProduct.ts`

skill/pattern ที่ใช้:

- แยก client hook สำหรับ state และ side effect
- ให้ component ส่งแค่ input เช่น `productId`, `quantity`, callback หลังสำเร็จ
- รักษา UX เดิมก่อน แล้วค่อยปรับ UI ทีหลัง

ไฟล์ที่จะสร้าง:

- `hooks/usePurchaseProduct.ts`

ไฟล์ที่จะแก้ในรอบนี้:

- `components/BuyButton.tsx`
- `components/FeaturedProducts.tsx`
- `components/ProductActions.tsx`
- `components/ProductCard.tsx`
- `components/SaleProducts.tsx`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ไม่เปลี่ยน API response shape ของ `/api/purchase`
- ไม่เปลี่ยน confirmation modal, PIN flow, success modal, warning/error copy โดยไม่จำเป็น
- ไม่รวม cart behavior เข้า hook ถ้าทำให้ UI แต่ละ component เปลี่ยน behavior
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- ยังไม่ใช้ Playwright ในรอบนี้ เพราะเป็น refactor logic และจะยืนยันด้วย test/lint ก่อน

test หลังทำ:

- `npm test`
- `npm run lint`

ผลตรวจล่าสุด:

- `hooks/usePurchaseProduct.ts` ถูกเพิ่มเป็น hook กลางสำหรับ confirm, prepare PIN/balance, POST `/api/purchase`, success modal, `router.refresh()`, และ redirect ไป inventory
- component ที่ migrate แล้ว: `components/BuyButton.tsx`, `components/FeaturedProducts.tsx`, `components/ProductActions.tsx`, `components/ProductCard.tsx`, `components/SaleProducts.tsx`
- cart behavior, promo code behavior, maintenance warning, และ mark sold หลังซื้อสำเร็จยังอยู่ใน component เดิมเพื่อไม่เปลี่ยน UX เกินจำเป็น
- `npm run lint` ผ่าน
- `npm test` ยังไม่ผ่านจาก test suite เดิมหลายจุด เช่น mock ของ `@/lib/auth` ไม่มี `requirePermission`, mock ของ `@/lib/csrf` ไม่มี `validateCsrfRequest`, assertion เก่าใน `tests/lib/cache.test.ts`, `tests/lib/userActions.test.ts`, และ `tests/components/announcement-popup.test.tsx`
- `npx tsc --noEmit` ยังไม่ผ่านจาก type errors ใน test เดิม เช่น `delete` บน property ที่ไม่ optional และการ assign `process.env.NODE_ENV`
- `git diff --check` ไม่พบ whitespace error แต่มี warning เรื่อง line ending และ `.obsidian/workspace.json` ยังเป็น local workspace state ที่ไม่ควร stage

### Step 4: API response และ validation contract

สถานะล่าสุด: เสร็จแล้ว 2026-05-07

เป้าหมาย:

- รวม response helper และ request body validation ให้เหลือมาตรฐานเดียว
- ลด `NextResponse.json(...)` ที่เขียนซ้ำใน route

สิ่งใหม่ที่จะเพิ่ม/ปรับ:

- ปรับ `lib/api.ts` ให้เป็น source of truth
- รวมแนวทางของ `lib/apiSecurity.ts`
- รวม `parseBody` กับ `validateBody`

skill/pattern ที่ใช้:

- ทำแบบ incremental migration
- ก่อนเปลี่ยน endpoint ต้องเช็ก client ที่อ่าน response shape เดิม
- ใช้ contract เดียว เช่น `{ success, message, data, errors, errorCode }`

ไฟล์ที่จะสร้าง:

- ไม่มีไฟล์ใหม่ใน slice แรกของ Step 4

ไฟล์ที่จะแก้ในรอบนี้:

- `lib/api.ts`
- `lib/apiSecurity.ts`
- `lib/validations/validate.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ยังไม่ migrate route จำนวนมากในรอบแรก เพราะ response shape ของแต่ละ endpoint ยังต่างกัน
- `lib/apiSecurity.ts` ต้องรักษา legacy shape เดิม เช่น `timestamp`, default message และ `errorCode`
- `lib/validations/validate.ts` ต้องรักษา legacy invalid JSON/status/message เดิมเพื่อไม่ทำให้ route tests ที่ mock/expect อยู่พัง
- `lib/api.ts` ต้องยังรองรับ `apiSuccess`, `apiError`, `parseBody` behavior เดิม
- ไม่ stage หรือรวม `.obsidian/workspace.json`

test หลังทำ:

- focused tests ของ `lib/api`, `lib/apiSecurity`, `validateBody`
- API tests ที่เกี่ยวข้อง
- `npm test`
- `npm run lint`

ผลตรวจล่าสุด:

- `lib/api.ts` ถูกปรับเป็น source of truth สำหรับ payload helpers, JSON body parsing, Zod error formatting, และ schema validation กลาง
- `lib/apiSecurity.ts` ใช้ payload/parser กลางจาก `lib/api.ts` แต่ยังรักษา legacy response shape เดิม เช่น `timestamp`, default `"Success"`, และ `errorCode`
- `lib/validations/validate.ts` ใช้ validation helper กลางจาก `lib/api.ts` แต่ยังรักษา invalid JSON message/status และ validation status เดิม
- ยังไม่ migrate route จำนวนมากในรอบนี้ เพื่อหลีกเลี่ยงการเปลี่ยน response shape ของ endpoint โดยไม่ตั้งใจ
- `npx vitest run tests/lib/api.test.ts tests/lib/apiSecurity.test.ts tests/lib/validateBody.test.ts tests/lib/permissions-validate.test.ts` ผ่าน 4 ไฟล์ / 71 tests
- `npm run lint` ผ่าน
- `npm test` ยังไม่ผ่านจาก test suite เดิมหลายจุด เช่น mock ของ `@/lib/auth` ไม่มี `requirePermission`, mock ของ `@/lib/csrf` ไม่มี `validateCsrfRequest`, assertion เก่าใน `tests/lib/cache.test.ts`, `tests/lib/userActions.test.ts`, และ `tests/components/announcement-popup.test.tsx`
- `git diff --check` ไม่พบ whitespace error แต่มี warning เรื่อง line ending และ `.obsidian/workspace.json` ยังเป็น local workspace state ที่ไม่ควร stage

### Step 5: Domain service extraction

เป้าหมาย:

- ทำให้ route handler บางลง
- ย้าย business logic ใหญ่ไป `lib/features/*`

สิ่งใหม่ที่จะเพิ่ม:

- `lib/features/topup/*`
- `lib/features/gacha/*`
- `lib/features/dashboard/*`
- `lib/features/content/*`

skill/pattern ที่ใช้:

- route handler รับ request/auth แล้วเรียก service
- service คืนผลลัพธ์แบบ typed result ไม่ผูกกับ `NextResponse`
- เพิ่ม test ที่ service ก่อนค่อยลด logic ใน route

ไฟล์ที่ควรเริ่มก่อน:

- `app/api/topup/route.ts`
- `app/api/gacha/roll/route.ts`
- `app/api/gacha/grid/roll/route.ts`
- `app/api/dashboard/topup-summary/route.ts`

test หลังทำ:

- unit/integration test ของ service
- API tests เฉพาะ route ที่แตะ
- `npm test`
- `npm run lint`

### Step 5.1: Topup pure helper extraction

สถานะล่าสุด: เสร็จแล้ว 2026-05-07

เป้าหมาย:

- แยก helper ที่เป็น pure logic ออกจาก `app/api/topup/route.ts`
- ลดขนาด route โดยยังไม่เปลี่ยน flow, response shape, DB logic, หรือ legacy slip provider behavior
- เตรียมฐานให้ Step 5.2 แยก legacy slip provider verification service ได้ง่ายขึ้น

ไฟล์ที่จะสร้าง:

- `lib/features/topup/slipHelpers.ts`
- `tests/lib/topupSlipHelpers.test.ts`

ไฟล์ที่จะแก้ในรอบนี้:

- `app/api/topup/route.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ย้ายเฉพาะ helper ที่ไม่ผูกกับ `NextResponse`, DB, auth, transaction, หรือ external fetch โดยตรง
- ห้ามเปลี่ยน production behavior และ response shape
- ไม่ stage หรือรวม `.obsidian/workspace.json`

test หลังทำ:

- focused unit test ของ `lib/features/topup/slipHelpers.ts`: ผ่าน 12 tests
- focused API test ของ `/api/topup`: ผ่าน 27 tests, skipped 5
- `npm test`: ผ่าน 100 files / 1317 tests, skipped 6
- `npm run lint`: ผ่าน

สิ่งที่แก้ใน Step 5.1:

- สร้าง `lib/features/topup/slipHelpers.ts` สำหรับ helper ที่ไม่ผูกกับ route/DB/response
- ย้าย topup helper ออกจาก `app/api/topup/route.ts` เช่น amount parsing, string field parsing, verify target/method, image extension, base64 size, public URL validation, legacy slip provider error mapping
- เพิ่ม `tests/lib/topupSlipHelpers.test.ts` เพื่อ lock behavior ของ helper ที่ย้ายออกมา
- ไม่เปลี่ยน production flow, response shape, transaction, auth, PIN, หรือ legacy slip provider fetch logic
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 5.2: Topup legacy slip provider verification service

สถานะล่าสุด: เสร็จแล้ว 2026-05-07

เป้าหมาย:

- แยก legacy slip provider verification logic ออกจาก `app/api/topup/route.ts`
- ให้ route ยังรับผิดชอบ auth, validation, fallback pending, DB transaction, และ response shape เหมือนเดิม
- เตรียมให้ Step 5.3 แยก topup transaction service ได้ง่ายขึ้น

ไฟล์ที่จะสร้าง:

- `lib/features/topup/legacy slip providerService.ts`
- `tests/lib/topuplegacy slip providerService.test.ts`

ไฟล์ที่จะแก้ในรอบนี้:

- `app/api/topup/route.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ไม่เปลี่ยน production behavior, response shape, fallback pending behavior, หรือ legacy slip provider request payload
- ไม่ย้าย DB transaction, PIN/auth, upload save, หรือ audit log ในรอบนี้
- ไม่ stage หรือรวม `.obsidian/workspace.json`

test หลังทำ:

- focused unit test ของ `lib/features/topup/legacy slip providerService.ts`: ผ่าน 8 tests
- focused API test ของ `/api/topup`: ผ่าน 27 tests, skipped 5
- `npm test`: ผ่าน 101 files / 1325 tests, skipped 6
- `npm run lint`: ผ่าน

สิ่งที่แก้ใน Step 5.2:

- สร้าง `lib/features/topup/legacy slip providerService.ts` สำหรับ legacy slip provider v1/v2 verification
- ย้าย legacy slip provider endpoint constants, response types, v1/v2 request building, v2 bank/truewallet response mapping ออกจาก `app/api/topup/route.ts`
- ให้ `app/api/topup/route.ts` เรียก service ใหม่ แต่ยังคงจัดการ auth, validation, fallback pending, DB transaction, upload save, audit log, และ response shape เหมือนเดิม
- เพิ่ม `tests/lib/topuplegacy slip providerService.test.ts` เพื่อ lock behavior ของ legacy slip provider service
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 5.3a: Topup data builders

สถานะล่าสุด: เสร็จแล้ว 2026-05-07

เป้าหมาย:

- แยก pure builder logic ของ topup ออกจาก `app/api/topup/route.ts`
- ให้ route ยังเป็นคนเรียก DB transaction, encryption, audit log, และ response เหมือนเดิม
- เตรียม Step 5.3b สำหรับย้าย transaction service โดยมี object builder ที่ test ได้ก่อน

ไฟล์ที่จะสร้าง:

- `lib/features/topup/topupBuilders.ts`
- `tests/lib/topupBuilders.test.ts`

ไฟล์ที่จะแก้ในรอบนี้:

- `app/api/topup/route.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ย้ายเฉพาะ pure object builders และ amount extraction
- ไม่ย้าย DB calls, `db.transaction`, `encryptTopupSensitiveFields`, `auditFromRequest`, upload save, auth, PIN, หรือ response status/message
- ไม่เปลี่ยน production behavior หรือ response shape
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped refactor และยืนยันด้วย focused/full tests แทน

test หลังทำ:

- focused unit test ของ `lib/features/topup/topupBuilders.ts`: ผ่าน 8 tests
- focused API test ของ `/api/topup`: ผ่าน 27 tests, skipped 5
- `npm test`: ผ่าน 102 files / 1333 tests, skipped 6
- `npm run lint`: ผ่าน

สิ่งที่แก้ใน Step 5.3a:

- สร้าง `lib/features/topup/topupBuilders.ts` สำหรับ pure builders ของ pending/approved topup insert payload, audit payload, response data, และ verified amount extraction
- ปรับ `app/api/topup/route.ts` ให้เรียก builders ใหม่ แต่ยังคงเป็นคนเรียก DB, encryption, audit, transaction, และ response เหมือนเดิม
- เพิ่ม `tests/lib/topupBuilders.test.ts` เพื่อ lock object shape ที่ route ใช้
- ไม่ย้าย DB calls, transaction, encryption, upload save, auth, PIN, หรือ audit execution
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 5.3b-1: Pending topup service

สถานะล่าสุด: เสร็จแล้ว 2026-05-07

เป้าหมาย:

- ย้ายเฉพาะ pending/manual-review topup DB insert และ audit execution ออกจาก `app/api/topup/route.ts`
- ให้ route ยังเป็นคนตัดสินใจว่าจะ fallback เป็น pending เมื่อไร และยัง return response shape/message เดิม
- เตรียม Step 5.3b-2 สำหรับ approved transaction service โดยไม่แตะยอดเงิน approved ในรอบนี้

ไฟล์ที่จะสร้าง:

- `lib/features/topup/topupService.ts`
- `tests/lib/topupService.test.ts`

ไฟล์ที่จะแก้ในรอบนี้:

- `app/api/topup/route.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ย้ายเฉพาะ pending/manual-review insert + audit execution
- ไม่ย้าย approved topup transaction, balance update, duplicate transaction check, upload save, auth, PIN, หรือ response status/message
- ไม่เปลี่ยน production behavior หรือ response shape
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped refactor และยืนยันด้วย focused/full tests แทน

test หลังทำ:

- focused unit test ของ pending topup service: ผ่าน 2 tests
- focused API test ของ `/api/topup`: ผ่าน 27 tests, skipped 5
- `npm test`: ผ่าน 103 files / 1335 tests, skipped 6
- `npm run lint`: ผ่าน

สิ่งที่แก้ใน Step 5.3b-1:

- สร้าง `lib/features/topup/topupService.ts`
- ย้ายเฉพาะ pending/manual-review topup DB insert และ audit execution ออกจาก `app/api/topup/route.ts`
- ให้ `app/api/topup/route.ts` ยังตัดสินใจ pending branch และ return message/response shape เดิม
- เพิ่ม `tests/lib/topupService.test.ts` เพื่อ lock pending service behavior
- ไม่ย้าย approved transaction, balance update, duplicate transaction check, upload save, auth, PIN, หรือ response status/message
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 5.3b-2: Approved topup transaction service

สถานะล่าสุด: เสร็จแล้ว 2026-05-07

เป้าหมาย:

- ย้าย approved topup transaction, balance update, และ audit execution ออกจาก `app/api/topup/route.ts`
- ให้ route ยังเป็นคนตรวจ verified amount, duplicate transaction, upload save, auth, PIN, และ return response shape/message เดิม
- ลดขนาด route ต่อจาก Step 5.3b-1 โดยไม่เปลี่ยน production behavior

ไฟล์ที่จะสร้าง:

- ไม่มี ใช้ `lib/features/topup/topupService.ts` และ `tests/lib/topupService.test.ts` ที่มีอยู่แล้ว

ไฟล์ที่จะแก้ในรอบนี้:

- `lib/features/topup/topupService.ts`
- `tests/lib/topupService.test.ts`
- `app/api/topup/route.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ย้ายเฉพาะ approved DB transaction + balance update + audit execution
- ไม่ย้าย duplicate transaction check, legacy slip provider verification, upload save, auth, PIN, หรือ response status/message
- ไม่เปลี่ยน production behavior หรือ response shape
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped refactor และยืนยันด้วย focused/full tests แทน

test หลังทำ:

- focused unit test ของ topup service: ผ่าน 4 tests
- focused API test ของ `/api/topup`: ผ่าน 27 tests, skipped 5
- `npm test`: ผ่าน 103 files / 1337 tests, skipped 6
- `npm run lint`: ผ่าน

สิ่งที่แก้ใน Step 5.3b-2:

- เพิ่ม `createLegacyApprovedTopup` ใน `lib/features/topup/topupService.ts`
- ย้ายเฉพาะ approved topup DB transaction, user balance update, และ audit execution ออกจาก `app/api/topup/route.ts`
- ให้ `app/api/topup/route.ts` ยังตรวจ verified amount, duplicate transaction, upload save, auth, PIN และ return message/response shape เดิม
- เพิ่ม unit test สำหรับ approved topup service รวมทั้งกรณีข้อมูล sender/bank/proof image เป็นค่าว่าง
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 5.3b-3: Topup duplicate slip checker

สถานะล่าสุด: เสร็จแล้ว 2026-05-07

เป้าหมาย:

- ย้าย logic ตรวจ duplicate transactionRef ออกจาก `app/api/topup/route.ts`
- ให้ route ยังเป็นคนตัดสินใจว่าจะตอบ error message/status เดิมเมื่อพบสลิปซ้ำ
- ลด DB business logic ที่เหลือใน topup route โดยไม่เปลี่ยน production behavior

ไฟล์ที่จะสร้าง:

- ไม่มี ใช้ `lib/features/topup/topupService.ts` และ `tests/lib/topupService.test.ts` ที่มีอยู่แล้ว

ไฟล์ที่จะแก้ในรอบนี้:

- `lib/features/topup/topupService.ts`
- `tests/lib/topupService.test.ts`
- `app/api/topup/route.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ย้ายเฉพาะ duplicate transactionRef lookup
- ไม่ย้าย user lookup, legacy slip provider verification, upload save, auth, PIN, หรือ response status/message
- ไม่เปลี่ยน production behavior หรือ response shape
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped refactor และยืนยันด้วย focused/full tests แทน

test หลังทำ:

- focused unit test ของ topup service: ผ่าน 6 tests
- focused API test ของ `/api/topup`: ผ่าน 27 tests, skipped 5
- `npm test`: ผ่าน 103 files / 1339 tests, skipped 6
- `npm run lint`: ผ่าน

สิ่งที่แก้ใน Step 5.3b-3:

- เพิ่ม `hasLegacyDuplicateTopupTransactionRef` ใน `lib/features/topup/topupService.ts`
- ย้าย duplicate transactionRef lookup ออกจาก `app/api/topup/route.ts`
- ให้ route ยัง return error message/status เดิมเมื่อพบสลิปซ้ำ
- เพิ่ม unit test สำหรับกรณี transactionRef ซ้ำและไม่ซ้ำ
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 5.3c: Topup request parser and validation

สถานะล่าสุด: เสร็จแล้ว 2026-05-07

เป้าหมาย:

- แยก form parsing และ validation ชั้นแรกของ topup request ออกจาก `app/api/topup/route.ts`
- ให้ route ยังเป็นคน return `NextResponse` ด้วย message/status เดิม
- ลด logic parsing ที่ซ้ำ/ยาวใน route โดยไม่แตะ legacy slip provider, upload, DB, auth หรือ PIN behavior

ไฟล์ที่จะสร้าง:

- `lib/features/topup/topupRequest.ts`
- `tests/lib/topupRequest.test.ts`

ไฟล์ที่จะแก้ในรอบนี้:

- `app/api/topup/route.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ย้ายเฉพาะ form parsing, provided method count, และ validation ชั้นแรก เช่น amount/method/truewallet payload
- ไม่ย้าย file signature validation, base64 size validation, public URL validation, legacy slip provider verification, upload save, DB, auth, PIN, หรือ response shape
- ไม่เปลี่ยน production behavior หรือ response message/status
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped refactor และยืนยันด้วย focused/full tests แทน

test หลังทำ:

- focused unit test ของ topup request parser: ผ่าน 8 tests
- focused API test ของ `/api/topup`: ผ่าน 27 tests, skipped 5
- `npm test`: ผ่าน 104 files / 1347 tests, skipped 6
- `npm run lint`: ผ่าน

สิ่งที่แก้ใน Step 5.3c:

- สร้าง `lib/features/topup/topupRequest.ts` สำหรับ parse form data, count proof methods, และ validate request ชั้นแรก
- สร้าง `tests/lib/topupRequest.test.ts` เพื่อ lock message/status เดิมของ amount/method/truewallet payload validation
- ปรับ `app/api/topup/route.ts` ให้ใช้ parser/validator ใหม่ แต่ยัง return `NextResponse` ด้วย response shape เดิม
- ไม่ย้าย file signature validation, base64 size validation, public URL validation, legacy slip provider verification, upload save, DB, auth, PIN, หรือ response shape
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 5.3d: Topup proof image validation helper

สถานะล่าสุด: เสร็จแล้ว 2026-05-07

เป้าหมาย:

- แยก validation logic ของ proof image ออกจาก `app/api/topup/route.ts`
- รวม rule ของ file signature, base64 size/format, และ public image URL ไว้ใน helper เดียว
- ให้ route ยัง return `NextResponse` ด้วย message/status เดิม และยังทำ upload save/legacy slip provider flow ที่เดิม

ไฟล์ที่จะสร้าง:

- `lib/features/topup/topupProofValidation.ts`
- `tests/lib/topupProofValidation.test.ts`

ไฟล์ที่จะแก้ในรอบนี้:

- `app/api/topup/route.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ย้ายเฉพาะ file/base64/image URL proof validation
- ไม่ย้าย upload save, legacy slip provider verification, DB, auth, PIN, duplicate check, หรือ response shape
- ไม่เปลี่ยน production behavior หรือ response message/status
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped refactor และยืนยันด้วย focused/full tests แทน

test หลังทำ:

- focused unit test ของ topup proof validation helper: ผ่าน 9 tests
- focused API test ของ `/api/topup`: ผ่าน 27 tests, skipped 5
- `npm test`: ผ่าน 105 files / 1356 tests, skipped 6
- `npm run lint`: ผ่าน

สิ่งที่แก้ใน Step 5.3d:

- สร้าง `lib/features/topup/topupProofValidation.ts` สำหรับ file signature, base64 size/format, และ public image URL validation
- ย้าย constants ของ slip validation เช่น allowed image types และ max slip bytes ไปใช้ร่วมจาก helper ใหม่
- สร้าง `tests/lib/topupProofValidation.test.ts` เพื่อ lock message/status เดิมของ proof validation
- ปรับ `app/api/topup/route.ts` ให้เรียก `validateTopupProofInput` แต่ยัง return `NextResponse` ด้วย response shape เดิม
- ไม่ย้าย upload save, legacy slip provider verification, DB, auth, PIN, duplicate check, หรือ response shape
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 5.3e: Topup slip verification orchestrator

สถานะล่าสุด: เสร็จแล้ว 2026-05-07

เป้าหมาย:

- แยก logic เลือกวิธีตรวจสลิปด้วย legacy slip provider ออกจาก `app/api/topup/route.ts`
- คง fallback pending behavior เดิมเมื่อ legacy slip provider config หายหรือ external verification error
- ให้ route ยังเป็นคนจัดการ response เมื่อ legacy slip provider คืน status ไม่ใช่ 200, duplicate check, upload save, DB, auth, PIN และ response shape

ไฟล์ที่จะสร้าง:

- `lib/features/topup/topupLegacyVerificationFlow.ts`
- `tests/lib/topupLegacyVerificationFlow.test.ts`

ไฟล์ที่จะแก้ในรอบนี้:

- `app/api/topup/route.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ย้ายเฉพาะ orchestration ของ payload/base64/url/file verification และ fallback pending flag
- ไม่เปลี่ยน legacy slip provider request payload, endpoint, mapping, error message, upload save, DB, auth, PIN, duplicate check, หรือ response shape
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped refactor และยืนยันด้วย focused/full tests แทน

test หลังทำ:

- focused unit test ของ topup verification flow: ผ่าน 8 tests
- focused API test ของ `/api/topup`: ผ่าน 27 tests, skipped 5
- `npm test`: ผ่าน 106 files / 1364 tests, skipped 6
- `npm run lint`: ผ่าน

สิ่งที่แก้ใน Step 5.3e:

- สร้าง `lib/features/topup/topupLegacyVerificationFlow.ts` สำหรับ orchestration ของ legacy slip provider v2/v1 และ fallback pending flag
- ย้าย logic เลือก payload/base64/url/file verification ออกจาก `app/api/topup/route.ts`
- คง behavior เดิมของ file v2 fallback ไป legacy slip provider v1, config missing fallback pending, และ external error fallback pending พร้อม log `[TOPUP_legacy slip provider]`
- สร้าง `tests/lib/topupLegacyVerificationFlow.test.ts` เพื่อ lock v2/v1/fallback/non-200 behavior
- ไม่เปลี่ยน legacy slip provider request payload, endpoint, mapping, error message, upload save, DB, auth, PIN, duplicate check, หรือ response shape
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 5.3f: Topup proof image storage helper

สถานะล่าสุด: เสร็จแล้ว 2026-05-07

เป้าหมาย:

- แยก logic save proof image และคำนวณ `proofImage` ออกจาก `app/api/topup/route.ts`
- ใช้ constants validation เดิมร่วมกับ upload options เพื่อไม่ให้ rule ของ slip กระจาย
- ให้ route ยังเป็นคนจัดการ legacy slip provider, DB, auth, PIN, duplicate check และ response shape เดิม

ไฟล์ที่จะสร้าง:

- `lib/features/topup/topupProofStorage.ts`
- `tests/lib/topupProofStorage.test.ts`

ไฟล์ที่จะแก้ในรอบนี้:

- `app/api/topup/route.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ย้ายเฉพาะ saveOptimizedImageUpload options และ proof image URL fallback
- ไม่ย้าย proof validation, legacy slip provider verification, DB, auth, PIN, duplicate check, หรือ response shape
- ไม่เปลี่ยน production behavior หรือ upload options
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped refactor และยืนยันด้วย focused/full tests แทน

test หลังทำ:

- focused unit test ของ topup proof storage helper: ผ่าน 4 tests
- focused API test ของ `/api/topup`: ผ่าน 27 tests, skipped 5
- `npm test`: ผ่าน 107 files / 1368 tests, skipped 6
- `npm run lint`: ผ่าน

สิ่งที่แก้ใน Step 5.3f:

- สร้าง `lib/features/topup/topupProofStorage.ts` สำหรับ save proof image และคำนวณ `proofImage`
- ย้าย `saveOptimizedImageUpload` options ออกจาก `app/api/topup/route.ts`
- ให้ helper ใช้ `TOPUP_ALLOWED_IMAGE_TYPES`, `TOPUP_MAX_SLIP_BYTES`, `PRIVATE_SLIP_UPLOAD_DIR`, และ `PRIVATE_SLIP_PATH_PREFIX` เดิม
- สร้าง `tests/lib/topupProofStorage.test.ts` เพื่อ lock upload options และ proof image URL fallback
- ไม่ย้าย proof validation, legacy slip provider verification, DB, auth, PIN, duplicate check, หรือ response shape
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 5.3g: Topup route cleanup and final audit

สถานะล่าสุด: เสร็จแล้ว 2026-05-07

เป้าหมาย:

- cleanup `app/api/topup/route.ts` หลังแยก service/helper หลายรอบ
- ปรับ import/flow/readability เฉพาะจุดที่ไม่เปลี่ยน production behavior
- สรุปว่า Topup refactor phase นี้ปิดได้แล้ว และ route เหลือหน้าที่ controller เป็นหลัก

ไฟล์ที่จะสร้าง:

- ไม่มี

ไฟล์ที่จะแก้ในรอบนี้:

- `app/api/topup/route.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ไม่ย้าย logic เพิ่มถ้าไม่จำเป็น
- ไม่เปลี่ยน production behavior, response shape, upload options, legacy slip provider flow, DB, auth, PIN, หรือ duplicate check
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped refactor และยืนยันด้วย focused/full tests แทน

test หลังทำ:

- focused topup tests: ผ่าน 9 files / 90 tests, skipped 5
- `npm test`: ผ่าน 107 files / 1368 tests, skipped 6
- `npm run lint`: ผ่าน

สิ่งที่แก้ใน Step 5.3g:

- cleanup import formatting ใน `app/api/topup/route.ts`
- เพิ่ม `shouldCreatePendingTopup` เพื่อให้ pending/approved branch อ่านชัดขึ้น โดยไม่เปลี่ยนเงื่อนไขเดิม
- ไม่ย้าย logic เพิ่ม และไม่เปลี่ยน production behavior, response shape, upload options, legacy slip provider flow, DB, auth, PIN, หรือ duplicate check
- ปิด Topup refactor phase นี้ได้แล้ว: route เหลือหน้าที่ controller เป็นหลัก และ business logic ถูกแยกไป `lib/features/topup/*` พร้อม unit tests
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 5.4a: Gacha reward mapping helpers

สถานะล่าสุด: เสร็จแล้ว 2026-05-07

เป้าหมาย:

- แยก pure reward mapping/helper ที่ซ้ำในหน้า Gacha ออกจาก page/route
- ให้ `app/gacha/page.tsx`, `app/gacha/play/page.tsx`, และ `app/gacha/[id]/page.tsx` ใช้ helper กลางสำหรับ map reward เป็น `GachaProductLite`
- ตรวจ gacha route ที่เกี่ยวข้องเพื่อดูว่ามี mapping contract เดียวกันหรือไม่ โดยไม่ย้าย roll/transaction/probability logic ในรอบนี้

ไฟล์ที่จะสร้าง:

- `lib/features/gacha/rewards.ts`
- `tests/lib/gachaRewards.test.ts`

ไฟล์ที่จะแก้ในรอบนี้:

- `app/gacha/page.tsx`
- `app/gacha/play/page.tsx`
- `app/gacha/[id]/page.tsx`
- gacha route ที่พบว่ามี reward mapping ซ้ำ เฉพาะถ้าเป็น pure mapping และไม่กระทบ response shape
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ย้ายเฉพาะ pure reward mapping/helper
- ไม่ย้าย roll transaction, probability, daily limit, DB mutation, auth, หรือ response behavior
- ไม่เปลี่ยน production behavior, UI data shape, หรือ API response shape
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped refactor และยืนยันด้วย focused/full tests แทน

test หลังทำ:

- focused unit test ของ gacha reward helper: ผ่าน 1 file / 5 tests
- focused affected gacha tests/routes: ผ่าน 9 files / 154 tests
- `npm test`: ผ่าน 108 files / 1373 tests, skipped 6
- `npm run lint`: ผ่าน

สิ่งที่แก้ใน Step 5.4a:

- สร้าง `lib/features/gacha/rewards.ts` สำหรับ map reward เป็น `GachaProductLite`, fallback tier เดิม, และ filter เฉพาะ reward ที่ eligible
- สร้าง `tests/lib/gachaRewards.test.ts` เพื่อ lock mapping ของ product reward, currency reward, custom point label, eligibility filter, และ tier fallback
- ปรับ `app/gacha/page.tsx`, `app/gacha/play/page.tsx`, `app/gacha/[id]/page.tsx` ให้ใช้ helper กลางแทน mapping ซ้ำ
- ปรับ `app/api/gacha/roll/route.ts` เฉพาะ `fetchTieredProducts` ให้ใช้ helper กลาง โดยไม่แตะ roll transaction, probability, daily limit, DB mutation, auth, หรือ response shape
- ตรวจ `app/api/gacha/grid/roll/route.ts` และ `app/api/gacha/grid/rewards/route.ts` แล้วไม่ย้ายในรอบนี้ เพราะเป็น response/display contract คนละชุดกับ `GachaProductLite`
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 5.4b: Gacha daily spin limit helper

สถานะล่าสุด: เสร็จแล้ว 2026-05-07

เป้าหมาย:

- แยก daily spin limit/date window/check logic ที่ซ้ำใน gacha roll route ออกเป็น helper กลาง
- ให้ `app/api/gacha/roll/route.ts` และ `app/api/gacha/grid/roll/route.ts` ใช้ helper เดียวกันสำหรับตรวจจำนวนการสุ่มรายวัน
- คง error message/status เดิม และไม่แตะ roll transaction logic

ไฟล์ที่จะสร้าง:

- `lib/features/gacha/limits.ts`
- `tests/lib/gachaLimits.test.ts`

ไฟล์ที่จะแก้ในรอบนี้:

- `app/api/gacha/roll/route.ts`
- `app/api/gacha/grid/roll/route.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ย้ายเฉพาะ daily spin limit/date window/check logic
- ไม่ย้าย reward selection, probability, lock, pending spin, DB mutation, balance deduction, หรือ response shape
- ไม่เปลี่ยน production behavior, response message/status, หรือ roll transaction logic
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped refactor และยืนยันด้วย focused/full tests แทน

test หลังทำ:

- focused unit test ของ gacha limit helper: ผ่าน 1 file / 5 tests
- focused affected gacha tests/routes: ผ่าน 10 files / 159 tests
- `npm test`: ผ่าน 109 files / 1378 tests, skipped 6
- `npm run lint`: ผ่าน

สิ่งที่แก้ใน Step 5.4b:

- สร้าง `lib/features/gacha/limits.ts` สำหรับ daily spin window, limit message, limit reached check, และ DB-backed daily spin checker
- สร้าง `tests/lib/gachaLimits.test.ts` เพื่อ lock day window, message เดิม, count comparison, และ injected count behavior
- ปรับ `app/api/gacha/roll/route.ts` ให้ใช้ `checkDailySpinLimit` จาก helper กลางแทน helper local
- ปรับ `app/api/gacha/grid/roll/route.ts` ให้ใช้ `checkDailySpinLimit` จาก helper กลางแทน helper local
- ไม่ย้าย reward selection, probability, lock, pending spin, DB mutation, balance deduction, response shape, หรือ roll transaction logic
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 5.4c: Gacha user lookup helper

สถานะล่าสุด: เสร็จแล้ว 2026-05-07

เป้าหมาย:

- แยก `fetchUserOrError` ที่ซ้ำใน gacha roll route ออกเป็น helper กลาง
- ให้ `app/api/gacha/roll/route.ts` และ `app/api/gacha/grid/roll/route.ts` ใช้ helper เดียวกันสำหรับ lookup user ก่อน roll
- คง `{ error: "ไม่พบผู้ใช้งาน", status: 404 }` และ `{ user }` behavior เดิม

ไฟล์ที่จะสร้าง:

- `lib/features/gacha/users.ts`
- `tests/lib/gachaUsers.test.ts`

ไฟล์ที่จะแก้ในรอบนี้:

- `app/api/gacha/roll/route.ts`
- `app/api/gacha/grid/roll/route.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ย้ายเฉพาะ user lookup helper
- ไม่ย้าย auth guard, reward selection, probability, daily limit, lock, pending spin, DB mutation, balance deduction, หรือ response shape
- ไม่เปลี่ยน production behavior, response message/status, หรือ roll transaction logic
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped refactor และยืนยันด้วย focused/full tests แทน

test หลังทำ:

- focused unit test ของ gacha user helper: ผ่าน 1 file / 3 tests
- focused affected gacha tests/routes: ผ่าน 11 files / 162 tests
- `npm test`: ผ่าน 110 files / 1381 tests, skipped 6
- `npm run lint`: ผ่าน

สิ่งที่แก้ใน Step 5.4c:

- สร้าง `lib/features/gacha/users.ts` สำหรับ lookup user ก่อน roll และคืน `{ user }` หรือ `{ error: "ไม่พบผู้ใช้งาน", status: 404 }` ตาม behavior เดิม
- สร้าง `tests/lib/gachaUsers.test.ts` เพื่อ lock success, null result, และ undefined result behavior
- ปรับ `app/api/gacha/roll/route.ts` ให้ใช้ `fetchGachaUserOrError` จาก helper กลางแทน helper local
- ปรับ `app/api/gacha/grid/roll/route.ts` ให้ใช้ `fetchGachaUserOrError` จาก helper กลางแทน helper local
- ไม่ย้าย auth guard, reward selection, probability, daily limit, lock, pending spin, DB mutation, balance deduction, response shape, หรือ roll transaction logic
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 5.4d: Gacha roll reward identity/details helpers

สถานะล่าสุด: เสร็จแล้ว 2026-05-07

เป้าหมาย:

- แยก pure helper ที่เกี่ยวกับ reward identity/details ออกจาก gacha roll routes
- ย้าย helper เช่น `buildChosenRewardId` และ `getRewardDetails` ไปไว้ใน `lib/features/gacha/rewards.ts`
- คง reward id fallback, reward display name, image URL, และ amount behavior เดิมทุกจุด

ไฟล์ที่จะสร้าง:

- ไม่มี ใช้ `lib/features/gacha/rewards.ts` และ `tests/lib/gachaRewards.test.ts` ที่มีอยู่แล้ว

ไฟล์ที่จะแก้ในรอบนี้:

- `lib/features/gacha/rewards.ts`
- `tests/lib/gachaRewards.test.ts`
- `app/api/gacha/roll/route.ts`
- `app/api/gacha/grid/roll/route.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ย้ายเฉพาะ pure reward identity/details helper
- ไม่ย้าย auth guard, user lookup, daily limit, reward selection, probability, lock, pending spin, DB mutation, balance deduction, หรือ response shape
- ไม่เปลี่ยน production behavior, response message/status, probability, หรือ roll transaction logic
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped refactor และยืนยันด้วย focused/full tests แทน

test หลังทำ:

- focused unit test ของ gacha reward helper: ผ่าน 1 file / 8 tests
- focused affected gacha tests/routes: ผ่าน 11 files / 165 tests
- `npm test`: ผ่าน 110 files / 1384 tests, skipped 6
- `npm run lint`: ผ่าน

สิ่งที่แก้ใน Step 5.4d:

- เพิ่ม `buildGachaChosenRewardId` ใน `lib/features/gacha/rewards.ts` เพื่อรวม reward id fallback ของ spin route
- เพิ่ม `getGachaRollRewardDetails` ใน `lib/features/gacha/rewards.ts` เพื่อรวม reward display name, image URL, และ amount rules ของ grid roll route
- อัปเดต `tests/lib/gachaRewards.test.ts` เพื่อ lock productId/product/reward fallback, product details fallback, empty image URL, empty rewardName, และ zero amount behavior เดิม
- ปรับ `app/api/gacha/roll/route.ts` ให้ใช้ `buildGachaChosenRewardId` แทน helper local
- ปรับ `app/api/gacha/grid/roll/route.ts` ให้ใช้ `getGachaRollRewardDetails` แทน helper local
- ไม่ย้าย auth guard, user lookup, daily limit, reward selection, probability, lock, pending spin, DB mutation, balance deduction, response shape, หรือ roll transaction logic
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 5.4e: Gacha machine settings helper

สถานะล่าสุด: เสร็จแล้ว 2026-05-07

เป้าหมาย:

- แยก machine/global gacha settings loading และ normalize cost logic ออกจาก gacha roll routes
- ให้ `app/api/gacha/roll/route.ts` ใช้ helper mode เดิมที่คืน `isEnabled` เพื่อให้ route เช็กต่อ
- ให้ `app/api/gacha/grid/roll/route.ts` ใช้ helper mode เดิมที่ throw เมื่อ machine/global settings disabled

ไฟล์ที่จะสร้าง:

- `lib/features/gacha/settings.ts`
- `tests/lib/gachaSettings.test.ts`

ไฟล์ที่จะแก้ในรอบนี้:

- `app/api/gacha/roll/route.ts`
- `app/api/gacha/grid/roll/route.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ย้ายเฉพาะ machine/global settings loading และ normalize cost logic
- ไม่ย้าย auth guard, user lookup, daily limit, reward selection, probability, lock, pending spin, DB mutation, balance deduction, หรือ response shape
- ไม่เปลี่ยน production behavior, response message/status, enabled/active handling, probability, หรือ roll transaction logic
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped refactor และยืนยันด้วย focused/full tests แทน

test หลังทำ:

- focused unit test ของ gacha settings helper: ผ่าน 1 file / 5 tests
- focused affected gacha tests/routes: ผ่าน 12 files / 170 tests
- `npm test`: ผ่าน 111 files / 1389 tests, skipped 6
- `npm run lint`: ผ่าน

สิ่งที่แก้ใน Step 5.4e:

- สร้าง `lib/features/gacha/settings.ts` สำหรับ machine/global settings loading และ normalize cost logic
- แยก helper เป็น `getSpinGachaSettings` และ `getGridGachaSettings` เพื่อรักษา enabled/active handling เดิมของแต่ละ route
- สร้าง `tests/lib/gachaSettings.test.ts` เพื่อ lock spin machine missing/inactive behavior, spin disabled `isEnabled`, global fallback, grid closed machine behavior, และ global disabled error
- ปรับ `app/api/gacha/roll/route.ts` ให้ใช้ `getSpinGachaSettings` โดยยังให้ route เช็ก `isEnabled` และคืน `"ระบบกาชาปิดอยู่ชั่วคราว"` เหมือนเดิม
- ปรับ `app/api/gacha/grid/roll/route.ts` ให้ใช้ `getGridGachaSettings` ที่ throw disabled machine/global settings ตาม behavior เดิม
- ไม่ย้าย auth guard, user lookup, daily limit, reward selection, probability, lock, pending spin, DB mutation, balance deduction, response shape, หรือ roll transaction logic
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 5.4f: Gacha roll route cleanup and final audit

สถานะล่าสุด: เสร็จแล้ว 2026-05-07

เป้าหมาย:

- cleanup `app/api/gacha/roll/route.ts` และ `app/api/gacha/grid/roll/route.ts` หลังแยก helper หลายรอบ
- ปรับเฉพาะ import/flow/readability/test naming ที่ไม่เปลี่ยน production behavior
- สรุปว่า Gacha roll helper phase นี้ปิดได้หรือยัง และ route เหลือ logic ส่วนไหนที่ตั้งใจยังไม่ย้าย

ไฟล์ที่จะสร้าง:

- ไม่มี

ไฟล์ที่จะแก้ในรอบนี้:

- `app/api/gacha/roll/route.ts`
- `app/api/gacha/grid/roll/route.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- ไม่ย้าย logic เพิ่มถ้าไม่จำเป็น
- ไม่เปลี่ยน production behavior, response shape, response message/status, probability, pending spin, lock, DB mutation, balance deduction, หรือ roll transaction logic
- ไม่ stage หรือรวม `.obsidian/workspace.json`
- GitNexus ยังใช้ไม่ได้ใน repo นี้เพราะยังไม่มี index จึงทำแบบ manual scoped refactor และยืนยันด้วย focused/full tests แทน

test หลังทำ:

- focused affected gacha tests/routes: ผ่าน 12 files / 170 tests
- `npm test`: ผ่าน 111 files / 1389 tests, skipped 6
- `npm run lint`: ผ่าน

สิ่งที่แก้ใน Step 5.4f:

- cleanup flow เล็ก ๆ ใน `app/api/gacha/roll/route.ts` ให้คืนผล `{ error, status }` จาก `fetchGachaUserOrError` ตรง ๆ แทนการประกอบ object ซ้ำ
- cleanup flow เล็ก ๆ ใน `app/api/gacha/grid/roll/route.ts` ให้คืนผล `{ error, status }` จาก `fetchGachaUserOrError` ตรง ๆ แทนการประกอบ object ซ้ำ
- ไม่ย้าย logic เพิ่ม และไม่เปลี่ยน production behavior, response shape, response message/status, probability, pending spin, lock, DB mutation, balance deduction, หรือ roll transaction logic
- ปิด Gacha roll helper phase นี้ได้แล้ว: route ใช้ shared helper สำหรับ reward mapping, daily limit, user lookup, reward identity/details, และ settings loading แล้ว
- logic ที่ตั้งใจยังอยู่ใน route: reward fetching/selection, probability validation, pending spin cookie/Redis state, transaction execution, lock handling, และ response branching
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

### Step 4.5: Baseline test cleanup ก่อน service extraction

สถานะล่าสุด: เริ่มทำ 2026-05-07

เป้าหมาย:

- เคลียร์ test baseline ที่ล้มจาก mock/assertion drift ก่อนเริ่มย้าย business logic หนักใน Step 5
- ทำให้ผล test รอบถัดไปบอก regression จาก refactor ได้ชัดขึ้น

ไฟล์ที่จะสร้าง:

- ไม่มี

ไฟล์ที่จะแก้ในรอบนี้:

- `tests/lib/auth.test.ts`
- `tests/lib/cache.test.ts`
- `tests/components/announcement-popup.test.tsx`
- `tests/lib/userActions.test.ts`
- `tests/api/*.test.ts` เฉพาะไฟล์ที่ mock `@/lib/auth` / auth-CSRF guard ล้าหลังจาก route contract ใหม่
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- แก้เฉพาะ test/mocking drift ที่ชี้ชัดจาก failure เดิม
- ไม่เปลี่ยน production behavior เพื่อให้ test ผ่าน
- ไม่ stage หรือรวม `.obsidian/workspace.json`

test หลังทำ:

- ผ่าน: `npx vitest run tests/lib/userActions.test.ts tests/lib/auth.test.ts tests/lib/cache.test.ts tests/components/announcement-popup.test.tsx`
- ผ่าน: `npx vitest run tests/api/products.test.ts`
- ผ่าน: `npx vitest run tests/api/purchase.test.ts tests/api/cart-checkout.test.ts tests/api/season-pass-claim.test.ts tests/api/remaining-routes.test.ts`
- ผ่าน: `npm run lint`
- ยังไม่ผ่านทั้งหมด: `npm test` เหลือ 45 failed / 1311 tests หลังลดจากกลุ่ม failure เดิมที่ล้มจำนวนมากจาก auth/CSRF mock drift

สิ่งที่แก้ในรอบนี้:

- ปรับ `tests/lib/auth.test.ts` ให้ mock `validateCsrfRequest` ตาม implementation ปัจจุบัน
- ปรับ `tests/lib/cache.test.ts` ให้ตรงกับ `FEATURED_PRODUCTS` cache key ปัจจุบัน
- ปรับ `tests/components/announcement-popup.test.tsx` ให้ตรงกับรูปแบบ localStorage dismiss state ปัจจุบัน
- ปรับ `tests/lib/userActions.test.ts` ให้ mock `bcryptjs`, `and`, `ne` และ flow current password/profile update ตรงกับ production
- ปรับ API test mocks ให้ `isAdmin`, `requirePermission`, `requirePermissionWithCsrf`, `requireAnyPermission`, `isAdminWithCsrf`, `isAuthenticatedWithCsrf` มี contract ครบขึ้น โดยไม่เปลี่ยน production behavior

งานที่เหลือก่อน Step 5:

- กลุ่ม date mock: เติม `toMySQLDatetime` ใน API tests ที่ mock `@/lib/utils/date`
- กลุ่ม gacha tests: เติม schema/mock ใหม่ เช่น `gachaMachinePatchSchema`, `and` จาก `drizzle-orm`, และ fixture reward ที่ route map ใหม่คาดหวัง
- กลุ่ม promo tests: sync fixture กับ `lib/features/promo/*` ที่ใช้ formatter/date shared helper ใหม่
- กลุ่ม public/slip/profile tests: sync fixture สำหรับ footer link `href`, `readStoredSlipFile`, และ runtime upload path ใหม่

### Step 4.6: Remaining baseline route test fixtures

สถานะล่าสุด: เริ่มทำ 2026-05-07

เป้าหมาย:

- เก็บ API route test fixture/mock ที่เหลือจาก `npm test` หลัง Step 4.5
- ทำให้ baseline test พร้อมก่อนเริ่ม Step 5 service extraction
- ไม่เปลี่ยน production behavior เพื่อให้ test ผ่าน

ไฟล์ที่จะสร้าง:

- ไม่มี

ไฟล์ที่จะแก้ในรอบนี้:

- `tests/api/admin-promo-roles.test.ts`
- `tests/api/admin-sub-routes.test.ts`
- `tests/api/admin-routes.test.ts`
- `tests/api/final-coverage-patch-2.test.ts`
- `tests/api/final-coverage-patch-3.test.ts`
- `tests/api/final-coverage-patch-4.test.ts`
- `tests/api/final-coverage-patch-6.test.ts`
- `tests/api/final-coverage-patch-7.test.ts`
- `tests/api/admin-gacha-content.test.ts`
- `tests/api/new-code-routes.test.ts`
- `tests/api/new-code-uncovered.test.ts`
- `tests/api/coverage-boost.test.ts`
- `tests/api/coverage-boost-2.test.ts`
- `tests/api/coverage-boost-3.test.ts`
- `tests/api/zero-coverage-routes.test.ts`
- `tests/api/admin-slip-image.test.ts`
- `tests/api/profile-upload.test.ts`
- `tests/api/public-routes.test.ts`
- `docs/planning/shared-layer-audit.md`

ข้อจำกัดของรอบนี้:

- แก้เฉพาะ test fixture/mock/assertion ที่ drift จาก implementation ปัจจุบัน
- ไม่แก้ `app/api/**`, `lib/**`, หรือ component production code เว้นแต่พบ bug จริงและบันทึกเหตุผลก่อน
- ไม่ stage หรือรวม `.obsidian/workspace.json`

test หลังทำ:

- focused tests ของไฟล์ API ที่แก้: ผ่าน 17 files / 323 tests
- `npx vitest run tests/api/coverage-boost.test.ts`: ผ่าน 27 tests, skipped 5
- `npm test`: ผ่าน 99 files / 1305 tests, skipped 6
- `npm run lint`: ผ่าน

สิ่งที่แก้ใน Step 4.6:

- เติม mock date export เช่น `toMySQLDatetime` ใน test ที่ import route ใหม่กว่าเดิม
- ปรับ role route assertions ให้ตรงกับ behavior ปัจจุบันที่ใช้ `resolveUniqueRoleCode` แทนการ reject duplicate code
- เติม gacha reward/machine fixture ให้ผ่าน eligibility และ probability summary โดยไม่แตะ production code
- ปรับ slip/profile/public/topup fixtures ให้ตรงกับ shared upload, auth, legacy slip provider v2, และ route response shape ปัจจุบัน
- ไม่ stage ไฟล์ใด ๆ และไม่รวม `.obsidian/workspace.json`

## Checklist ก่อนลงมือ refactor

- ตรวจ response shape ของ endpoint ที่มี client เรียกหลายจุดก่อนเปลี่ยน API helper
- เพิ่ม test ให้ pure logic ที่เกี่ยวกับเงิน, stock, purchase, gacha probability, topup
- ทำทีละ domain และ run `npm test` / `npm run lint` หลังแต่ละชุด
- ถ้าแตะ admin access ให้เช็กทั้ง `components/admin/AdminSidebar.tsx` และ `lib/adminAccess.ts`
- อย่า commit `.obsidian/workspace.json` ถ้าเป็นแค่ local workspace state

## สรุปคำตอบของคำถามหลัก

โค้ดใช้ระบบส่วนกลางอยู่ แต่ยังใช้ไม่เต็มที่ทุกส่วน โดยเฉพาะ API route และ client-side workflow หลายจุดยังซ้ำกันเอง

จุดที่ควรลดก่อนเพื่อให้โค้ดสั้นลงและดูแลง่ายขึ้น:

1. purchase flow
2. product discount helper
3. API response/validation helper
4. gacha reward/roll helper
5. crop dialog
6. constants ของ endpoint, storage key, gacha tier

ถ้าจะเริ่ม refactor จริง แนะนำเริ่มจาก Phase 1 เพราะกระทบระบบน้อยและสร้าง shared foundation ให้ phase ถัดไป
