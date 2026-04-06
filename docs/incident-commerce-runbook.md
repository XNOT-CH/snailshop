# Commerce Incident Runbook

ใช้เอกสารนี้ตอนระบบ `กาชา / ซื้อสินค้า / ตะกร้า / เติมเงิน` มีปัญหาและต้องหยุดความเสียหายแบบเร็วและปลอดภัย

## 1. ปิดระบบแบบหยุดเลือด

ตั้งค่า env ตาม scope ที่ต้องการ แล้ว redeploy:

- `MAINTENANCE_MODE_GACHA=true`
- `MAINTENANCE_MODE_PURCHASE=true`
- `MAINTENANCE_MODE_TOPUP=true`
- `MAINTENANCE_MESSAGE_GACHA=...`
- `MAINTENANCE_MESSAGE_PURCHASE=...`
- `MAINTENANCE_MESSAGE_TOPUP=...`
- `MAINTENANCE_RETRY_AFTER_SECONDS=60`

ถ้าต้องปิดทั้งชุดพร้อมกัน ใช้:

- `MAINTENANCE_MODE=true`

ผลที่ได้:

- หน้าเว็บจะแสดงข้อความปิดปรับปรุงใน flow หลัก
- API จะตอบ `503`
- response จะมี `Retry-After`

## 2. เช็กว่ามีรายการผิดปกติหรือไม่

รัน:

```bash
npm run ops:reconcile-commerce
```

ถ้าต้องการดูย้อนหลังมากกว่า 24 ชั่วโมง:

```bash
node scripts/reconcile-commerce.mjs --hours 72
```

สคริปต์นี้เป็น `read-only` ไม่แก้ข้อมูลเอง และจะรายงาน:

- completed orders ที่ไม่มี product link
- sold products ที่ไม่มี `orderId`
- products ที่ชี้ไปหา order ที่หายไป
- topups ที่ยัง `PENDING` เกิน 30 นาที

## 3. จุดที่ต้องตรวจเพิ่มตอน incident

- ดู error log ของ `purchase`, `cart checkout`, `topup`, `gacha`
- ดู latency/CPU/connection ของ database
- ดูว่ามี traffic spike หรือ retry ซ้ำจาก client หรือไม่
- ถ้าจำเป็น ให้เปิด Cloudflare Waiting Room แยกจาก maintenance ในแอป

## 4. หลังระบบกลับมา

ทำตามลำดับนี้:

1. รัน `npm run ops:reconcile-commerce`
2. ตรวจรายการที่สคริปต์รายงาน
3. เคลียร์รายการค้างด้วย manual review
4. ค่อยปิด maintenance env
5. ทดสอบซื้อจริง 1 รายการ, checkout 1 ครั้ง, เติมเงิน 1 ครั้ง, กาชา 1 ครั้ง

## 5. หมายเหตุ

- maintenance gate ที่มีตอนนี้ออกแบบมาให้ `ไม่ต้อง migration`
- rate limit ที่ใส่ไว้เป็น in-memory เหมาะกับ single-instance หรือใช้กันชั่วคราว
- ถ้าจะใช้หลาย instance ควรย้าย rate limit ไป Redis ในรอบถัดไป
