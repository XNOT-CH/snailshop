# Shop Testing and Fix Plan

เอกสารนี้เป็นแผนสำหรับทดสอบระบบ shop บน branch `codex/shop-testing` โดยเน้น security, maintainability, best practices และความถูกต้องของ flow สำคัญ: ดูสินค้า, เพิ่มตะกร้า, checkout, ใช้ promo, หักเครดิต/พอยท์, และรับสินค้า

## เป้าหมาย

1. ยืนยันว่าเส้นทาง `ดูสินค้า -> ซื้อสินค้า -> รับสินค้า` ทำงานถูกต้องและปลอดภัย
2. หา anomaly ที่เหลือใน shop, cart, purchase, stock, promo และ inventory
3. แยกให้ชัดว่าอะไรเป็น bug ที่ต้องแก้ทันที และอะไรเป็น improvement ที่ทำภายหลังได้
4. เพิ่มความมั่นใจก่อน merge หรือ deploy โดยใช้ test และ smoke test ที่ทำซ้ำได้

## สถานะปัจจุบัน

- แก้ anomaly แล้ว: cart checkout เคยตรวจเครดิตจากยอดเต็มก่อนหัก promo ทำให้ผู้ใช้ที่มีเครดิตพอดีกับยอดหลังลดถูกปฏิเสธ
- เพิ่ม regression test แล้วใน `tests/api/cart-checkout.test.ts`
- ตรวจแล้วว่า `npm run build` ผ่าน
- branch สำหรับทดสอบ: `codex/shop-testing`

## Priority 0: ต้องตรวจซ้ำก่อนเริ่มแก้เพิ่ม

### Security

1. ตรวจว่า `/api/purchase` และ `/api/cart/checkout` ไม่เชื่อราคา, discount, currency, หรือ stock count จาก client
2. ตรวจว่าการซื้อทุกแบบต้องใช้ authenticated session และ PIN สำหรับ protected action
3. ตรวจว่า public product API ไม่ส่ง `secretData`, given data, หรือข้อมูลลับของ stock ออกไป
4. ตรวจว่า purchase/cart checkout มี rate limit และ error response ไม่เปิดเผยข้อมูลเกินจำเป็น
5. ตรวจว่าการซื้อใช้ transaction และ lock product row ก่อนตัด stock

### Correctness

1. ซื้อสินค้าชิ้นเดียวสำเร็จ และ order มี given data ถูกต้อง
2. ซื้อผ่านตะกร้าสำเร็จ ทั้งสินค้าหนึ่งชิ้นและหลายชิ้น
3. ใช้ promo แล้วราคาที่แสดง, ราคาที่ validate, และราคาที่ตัดจริงตรงกัน
4. สินค้า currency `THB` และ `POINT` แยก balance ถูกต้อง
5. สินค้าที่ stock หมดหรือ `isSold = true` ต้องซื้อไม่ได้ทุกช่องทาง
6. กรณี stock เหลือ 1 ชิ้น ต้องตัด stock แล้ว mark sold ถูกต้อง
7. กรณี cart stale หลังสินค้าโดนซื้อจากที่อื่น ต้อง fail อย่างปลอดภัยและแจ้งผู้ใช้ชัดเจน

### Maintainability

1. ซื้อเดี่ยวและ checkout ผ่านตะกร้าควรใช้ logic กลางใน `lib/features/orders/purchase.ts`
2. Promo validation, price calculation, stock handling และ balance update ควรถูก test แยกตาม behavior
3. Route handler ควรบางพอ: validate request, auth, call service, return response
4. Error message ควรอยู่ในรูปแบบที่ผู้ใช้เข้าใจ แต่ไม่ผูก business logic กระจัดกระจายเกินไป

## Priority 1: Test Matrix ที่ควรรัน

### API Tests

รันชุดนี้ก่อน เพราะจับ regression ของ business logic ได้เร็ว:

```powershell
npm test -- tests/api/cart-checkout.test.ts
npm test -- tests/api/purchase.test.ts
npm test -- tests/api/products.test.ts tests/api/products-id.test.ts tests/api/product-stock-separator.test.ts
npm test -- tests/api/promo-codes.test.ts tests/api/promo-validate.test.ts
```

ผลที่ต้องการ:

- ทุก test ผ่าน
- ไม่มี test ที่ต้อง skip โดยไม่มีเหตุผล
- ถ้า test fail จาก fixture เก่า ให้แยกว่าเป็น test drift หรือ bug จริงก่อนแก้

### Build and Deploy Checks

```powershell
npm run build
npm run check:deploy
```

ผลที่ต้องการ:

- Next build ผ่าน
- TypeScript ผ่าน
- deploy validation script ไม่เจอ missing env หรือ route/config issue สำคัญ

### DB Health and Purchase Locking

ถ้า local database พร้อม ให้รัน:

```powershell
npm run check:db-health
npm run check:purchase-locking
```

ผลที่ต้องการ:

- schema/index สำคัญพร้อมใช้งาน
- purchase locking ไม่เปิดช่องขาย stock ซ้ำ

## Priority 2: Manual Smoke Test

ทดสอบด้วย browser หรือ local dev server:

1. เปิด `/shop`
2. กรอง category และเปลี่ยน sort
3. เปิด `/product/[id]`
4. เพิ่มสินค้าลง cart
5. เปลี่ยน quantity ใน cart โดยไม่เกิน stock
6. checkout โดยไม่ใช้ promo
7. checkout โดยใช้ promo แบบ fixed discount
8. checkout โดยใช้ promo แบบ percentage discount
9. ซื้อสินค้า `POINT` ถ้ามี test data
10. ตรวจ `/dashboard/inventory` ว่า order และ given data แสดงถูกต้อง
11. ลองซื้อสินค้าหมดหรือสินค้าที่เพิ่งถูกซื้อไปแล้ว ต้อง fail แบบปลอดภัย

Acceptance criteria:

- ราคาใน UI, modal ยืนยันซื้อ, API response และ receipt ตรงกัน
- stock ลดลงตามจำนวนที่ซื้อ
- สินค้าหมดไม่แสดงเป็นพร้อมขาย
- ข้อมูลลับของสินค้าไม่โผล่ใน network response ก่อนซื้อสำเร็จ
- user feedback ภาษาไทยอ่านเข้าใจและไม่ technical เกินไป

## สิ่งที่ต้องแก้ถ้าพบ

### Must Fix

- Client สามารถส่งราคา/ส่วนลดเองแล้ว server เชื่อ
- Public API ส่งข้อมูล stock ลับหรือ given data
- ซื้อสินค้าได้โดยไม่ login, ไม่ผ่าน PIN, หรือ bypass rate limit ได้ง่าย
- Stock ถูกขายซ้ำจาก race condition
- หักเครดิต/พอยท์ผิดยอด หรือสร้าง order แต่ไม่ตัด balance/stock ให้ครบ transaction
- Promo ทำให้ยอดติดลบหรือใช้กับ currency ที่ไม่ควรใช้ได้

### Should Fix

- ซื้อเดี่ยวกับซื้อผ่าน cart คำนวณราคาไม่เหมือนกัน
- Error message ไม่ชัด เช่นบอก generic ทั้งที่ควรแจ้ง stock หมดหรือเครดิตไม่พอ
- Test coverage ขาดสำหรับ case สำคัญ เช่น stock เหลือ 1, cart stale, promo user limit
- Route handler มี business logic มากเกินไปจนดูแลยาก

### Nice to Have

- เพิ่ม e2e smoke test สำหรับ shop flow
- เพิ่ม admin-facing stock audit ที่ละเอียดขึ้น
- เพิ่ม monitoring/log เฉพาะ purchase failure reason
- เพิ่ม runbook สำหรับ incident เช่นขาย stock ซ้ำหรือ promo คิดผิด

## Recommended Fix Order

ถ้าเจอหลาย issue พร้อมกัน ให้แก้ตามลำดับนี้:

1. Security bypass และข้อมูลลับรั่ว
2. การหักเงิน, stock, order transaction
3. Promo และ price calculation
4. Cart stale และ user-facing error
5. Maintainability refactor
6. UI polish และข้อความภาษาไทย

## Definition of Done

งาน shop testing รอบนี้ถือว่าจบเมื่อ:

1. Must Fix ทั้งหมดเป็น 0 หรือมีเหตุผลชัดเจนว่ารับความเสี่ยงได้
2. `npm test -- tests/api/cart-checkout.test.ts` ผ่าน
3. `npm test -- tests/api/purchase.test.ts` ผ่าน
4. `npm run build` ผ่าน
5. smoke test `/shop -> cart -> checkout -> inventory` ผ่านอย่างน้อย 1 รอบ
6. เอกสารนี้อัปเดตตามผลทดสอบจริงถ้าพบ issue ใหม่

## Notes

- ระวัง encoding ภาษาไทยเสมอ ใช้ UTF-8 เมื่ออ่านหรือเขียนไฟล์ผ่าน PowerShell
- อย่าแก้ business logic โดยอิงเฉพาะ UI เพราะ purchase path ต้องถูก enforce ฝั่ง server
- ถ้าต้องแก้ schema หรือ transaction ให้เพิ่ม test ก่อนหรือพร้อมกับ patch เพื่อกัน regression
