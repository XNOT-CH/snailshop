# Project Roadmap

เอกสารนี้แตกงานจาก [docs/project-requirements.md](C:/Users/USER/my-game-store/docs/project-requirements.md) ออกเป็น phase และ step เล็ก ๆ เพื่อใช้วางลำดับการพัฒนาแบบต่อเนื่อง

## แนวทางการใช้เอกสารนี้

- ใช้ roadmap นี้เป็นแผนกลางสำหรับเลือกงานรอบถัดไป
- ในแต่ละรอบพัฒนา ควรหยิบทีละ step หรือทีละกลุ่ม step ที่เกี่ยวกัน
- หากงานใดมีผลต่อ auth, payment, stock, หรือ admin permission ให้ทำ review เรื่อง security เพิ่มทุกครั้ง

## Phase 0: Project Baseline และความเข้าใจระบบ

เป้าหมาย:
ให้ทีมเข้าใจขอบเขตระบบปัจจุบันก่อนเพิ่มฟีเจอร์ใหม่หรือ refactor

Steps:

1. ตรวจสอบเอกสาร requirement ว่าครอบคลุมระบบปัจจุบันหรือยัง
2. ระบุ feature หลักที่เป็น revenue path ของระบบ เช่น สมัครสมาชิก, เติมเงิน, ซื้อสินค้า, รับสินค้า
3. ระบุ feature สำคัญฝั่ง admin เช่น จัดการสินค้า, อนุมัติสลิป, จัดการกาชา, จัดการผู้ใช้
4. ระบุไฟล์ high-signal ของแต่ละโมดูลเพื่อใช้เป็นจุดเริ่มต้นเวลาพัฒนา
5. จัดลำดับความสำคัญว่าอะไรคือ critical path ของธุรกิจ

ผลลัพธ์ที่คาดหวัง:

- มี requirement baseline
- มี roadmap สำหรับคุยงานต่อ
- ลดความเสี่ยงในการแก้ผิดจุด

## Phase 1: Core Security และ Access Control

เป้าหมาย:
ทำให้ระบบที่มีอยู่ปลอดภัยและบังคับสิทธิ์สอดคล้องกันทั้งหน้าเว็บและ API

Steps:

1. ตรวจสอบ flow login, logout, session, reset password
2. ตรวจสอบว่า admin page ทุกหน้ามี backend authorization ครบ ไม่พึ่งแค่การซ่อนเมนู
3. ตรวจสอบ mapping ระหว่าง route กับ permission ใน `lib/adminAccess.ts` และ `lib/permissions.ts`
4. ตรวจสอบว่า mutation routes ใช้ CSRF protection ครบ
5. ตรวจสอบ validation ฝั่ง server สำหรับ endpoint ที่รับข้อมูลสำคัญ
6. ตรวจสอบจุดที่ควรมี rate limiting เช่น login, register, topup, purchase, gacha roll
7. ตรวจสอบการจัดเก็บข้อมูลลับ เช่น stock, slip, user-sensitive data
8. สรุป security gaps ที่ควรแก้ก่อนขยายฟีเจอร์

ผลลัพธ์ที่คาดหวัง:

- ลดความเสี่ยงจาก privilege bypass
- ลดความเสี่ยงจาก request ปลอมและ input ไม่ปลอดภัย
- ได้รายการ hardening tasks ที่ชัดเจน

## Phase 2: User Authentication และ Account Experience

เป้าหมาย:
ทำให้ flow บัญชีผู้ใช้ใช้งานได้ลื่นและดูแลง่าย

Steps:

1. ทบทวนหน้าสมัครสมาชิกและกฎ validation ของข้อมูล
2. ทบทวนหน้าล็อกอินและ error states ที่ผู้ใช้เจอได้จริง
3. ทบทวน reset password flow ทั้งหน้า UI และ API
4. ตรวจสอบ session handling ในหน้า dashboard และ profile
5. ปรับปรุงข้อความแจ้งเตือนให้เข้าใจง่ายสำหรับผู้ใช้ไทย
6. ตรวจสอบว่า profile update ไม่เปิดช่องให้แก้ข้อมูลเกินสิทธิ์
7. เพิ่มหรือปรับ test สำหรับ auth flows ที่สำคัญ

ผลลัพธ์ที่คาดหวัง:

- ผู้ใช้สมัครและเข้าสู่ระบบได้เสถียร
- account flows อ่านง่ายและลด support load

## Phase 3: Product Catalog และ Purchase Flow

เป้าหมาย:
ทำให้เส้นทาง “ดูสินค้า → ซื้อสินค้า → รับสินค้า” เป็นเส้นทางที่ชัดและเชื่อถือได้

Steps:

1. ทบทวนหน้าร้านและหน้ารายละเอียดสินค้า
2. ตรวจสอบการแสดงผลราคา, ส่วนลด, สถานะสินค้า, และ featured/sale sections
3. ทบทวน cart และ checkout flow
4. ตรวจสอบการใช้ promo code ทั้ง validation และการคำนวณราคา
5. ตรวจสอบ purchase flow ว่าหักเครดิตและสร้าง order อย่างถูกต้อง
6. ตรวจสอบการมอบข้อมูลสินค้าให้ลูกค้าหลังซื้อ
7. ตรวจสอบ edge case เช่น สินค้าหมด, ราคาผิด, promo หมดอายุ, เครดิตไม่พอ
8. เพิ่ม test สำหรับ business logic ด้าน purchase และ pricing

ผลลัพธ์ที่คาดหวัง:

- purchase flow เสถียร
- ลดโอกาสข้อมูล order ผิดหรือสินค้าหลุด stock

## Phase 4: Stock, Secret Data และ Post-Purchase Automation

เป้าหมาย:
ทำให้การจัดการ stock สินค้าดิจิทัลปลอดภัยและดูแลง่าย

Steps:

1. ตรวจสอบรูปแบบการเก็บ stock และ secret product data
2. ตรวจสอบ validation สำหรับ stock import/create/edit
3. ตรวจสอบการป้องกันข้อมูล stock ซ้ำข้ามสินค้าในกรณีที่ระบบรองรับ
4. ตรวจสอบการดึง stock ไปใช้ตอนซื้อว่า atomic เพียงพอหรือไม่
5. ตรวจสอบระบบ auto-delete หลังขาย
6. ตรวจสอบ audit trail ของการเปลี่ยนแปลง stock ที่สำคัญ
7. เพิ่ม test สำหรับ duplicate prevention และ post-purchase stock handling

ผลลัพธ์ที่คาดหวัง:

- stock management เสถียร
- ลดความเสี่ยงข้อมูลรั่วและการขายซ้ำ

## Phase 5: Top-up, Wallet และ Payment Operations

เป้าหมาย:
ทำให้กระบวนการเติมเงินและการเพิ่มยอดเครดิตทำงานถูกต้องและตรวจสอบย้อนหลังได้

Steps:

1. ทบทวน topup submission flow ของผู้ใช้
2. ตรวจสอบ validation ของจำนวนเงินและไฟล์สลิป
3. ตรวจสอบการเก็บไฟล์สลิปและข้อมูลอ้างอิงอย่างปลอดภัย
4. ทบทวนหน้า admin สำหรับอนุมัติหรือปฏิเสธสลิป
5. ตรวจสอบว่าการอนุมัติเติมเงินเพิ่มยอดเครดิตแบบไม่ซ้ำซ้อน
6. ตรวจสอบสถานะธุรกรรมและ log ที่เกี่ยวข้อง
7. เพิ่ม test สำหรับ approval/rejection flows และ duplicate approval prevention

ผลลัพธ์ที่คาดหวัง:

- ระบบเติมเงินเชื่อถือได้
- ลดความเสี่ยงเครดิตเกินจริงหรือ approve ซ้ำ

## Phase 6: Admin Console และ Operational Efficiency

เป้าหมาย:
ทำให้ผู้ดูแลระบบทำงานประจำวันได้ง่ายขึ้นและลดความผิดพลาดจาก manual work

Steps:

1. ทบทวน admin navigation และสิทธิ์การเข้าถึงแต่ละเมนู
2. ทบทวน CRUD ของสินค้า, ผู้ใช้, ข่าวสาร, popup, help, nav, footer, currency settings
3. ตรวจสอบ consistency ของ form validation ระหว่าง UI กับ API
4. ตรวจสอบว่าหน้าที่เสี่ยงมี confirmation, feedback, และ error handling ที่ชัดเจน
5. ทบทวน dashboard และ export ว่าตรงกับข้อมูลที่ผู้ดูแลต้องใช้
6. ระบุจุดที่ควรแยก logic ออกจาก page ให้ maintain ง่ายขึ้น

ผลลัพธ์ที่คาดหวัง:

- admin ทำงานได้เร็วขึ้น
- ลด bug จากหน้า form และ permission mismatch

## Phase 7: Content Management และ Storefront Experience

เป้าหมาย:
ยกระดับประสบการณ์หน้าร้านและการจัดการคอนเทนต์หน้าเว็บ

Steps:

1. ทบทวน hero, featured products, sale products, popups, news, help, nav, footer
2. ตรวจสอบ fallback behavior เมื่อข้อมูล content บางส่วนยังไม่ถูกตั้งค่า
3. ปรับปรุงความสม่ำเสมอของข้อความภาษาไทยและ CTA
4. ตรวจสอบ mobile experience ของหน้าสำคัญ
5. ตรวจสอบการโหลดรูปภาพและ asset ที่เกี่ยวข้อง
6. เพิ่ม acceptance checklist สำหรับหน้า storefront หลัก

ผลลัพธ์ที่คาดหวัง:

- หน้าร้านดูพร้อมใช้งานมากขึ้น
- content admins จัดการหน้าเว็บได้ง่ายขึ้น

## Phase 8: Gacha Platform Stabilization

เป้าหมาย:
ทำให้ระบบกาชาเป็นโมดูลที่เสถียร ตรวจสอบง่าย และขยายต่อได้

Steps:

1. ทบทวน machine list, machine detail, roll flow, history, recent feed
2. ตรวจสอบ cost calculation สำหรับ FREE, CREDIT, POINT
3. ตรวจสอบ probability logic และ reward assignment
4. ตรวจสอบ daily spin limit และเงื่อนไขการเล่น
5. ทบทวน admin CRUD สำหรับ machines, rewards, categories, settings
6. ตรวจสอบ audit/logging สำหรับกิจกรรมที่สำคัญในกาชา
7. เพิ่ม test สำหรับ cost, probability, roll constraints, และ reward delivery

ผลลัพธ์ที่คาดหวัง:

- ระบบกาชาเชื่อถือได้
- ลดความเสี่ยงเรื่อง balance, reward, และ fairness bugs

## Phase 9: Gacha Grid / SPIN_X Improvement

เป้าหมาย:
ทำให้โหมด grid game เข้าใจง่ายทั้งฝั่งโค้ดและฝั่งผู้ใช้

Steps:

1. ทบทวน logic ใน `lib/gachaGrid.ts`
2. ทำแผนภาพหรือเอกสารอธิบาย selector/path/intersection flow
3. ตรวจสอบการแสดงผลลัพธ์ใน UI ให้ตรงกับ logic ฝั่ง server
4. ตรวจสอบกรณีขอบ เช่น path ไม่ครบ, reward map ไม่ตรง, config ผิด
5. เพิ่ม test ที่ครอบคลุม grid outcomes หลัก

ผลลัพธ์ที่คาดหวัง:

- maintain logic ได้ง่ายขึ้น
- ลด bug จากระบบคำนวณที่ซับซ้อน

## Phase 10: Loyalty, Season Pass และ Growth Features

เป้าหมาย:
พัฒนาฟีเจอร์ที่ช่วยให้ผู้ใช้กลับมาใช้งานซ้ำและเพิ่ม engagement

Steps:

1. ทบทวน tier calculation และการแสดงผลสถานะสมาชิก
2. ทบทวน season pass flow และ reward claim
3. ทบทวน referral flow และ anti-abuse conditions
4. ตรวจสอบความชัดเจนของกติกาการได้ point และ reward
5. ระบุ metric ที่ควรติดตามสำหรับ growth features

ผลลัพธ์ที่คาดหวัง:

- growth features พร้อมขยายต่อ
- business rules ชัดเจนมากขึ้น

## Phase 11: Code Quality, Testing และ Refactoring

เป้าหมาย:
ลดภาระการดูแลระยะยาวและทำให้ระบบพัฒนาต่อได้มั่นใจขึ้น

Steps:

1. ระบุ module ที่ page หรือ route มี business logic มากเกินไป
2. แยก logic ไปไว้ใน `lib/features`, validation, หรือ utility ที่เหมาะสม
3. เพิ่ม test coverage ในเส้นทางวิกฤต
4. ตรวจสอบ Sonar issues และ technical debt ที่สำคัญ
5. ย้าย secret หรือ token ที่ hardcoded ไปสู่ environment variables
6. ปรับ naming และ code structure ให้สม่ำเสมอขึ้น

ผลลัพธ์ที่คาดหวัง:

- maintainability ดีขึ้น
- regression risk ลดลง

## Phase 12: Operations, Monitoring และ Deployment Confidence

เป้าหมาย:
ทำให้ระบบพร้อมใช้งานจริงและตรวจจับปัญหาได้ไวขึ้น

Steps:

1. ตรวจสอบ health endpoints และ deployment validation scripts
2. ทบทวน database migration flow สำหรับ dev และ production
3. ตรวจสอบ backup/export/import scripts ที่เกี่ยวข้องกับข้อมูลสำคัญ
4. ทบทวน logging และ incident runbooks
5. ระบุ smoke test checklist หลัง deploy
6. วางแผน monitoring สำหรับ purchase, topup, gacha, และ admin errors

ผลลัพธ์ที่คาดหวัง:

- deploy ได้มั่นใจขึ้น
- แก้ incident ได้เร็วขึ้น

## ลำดับแนะนำสำหรับการลงมือจริง

ถ้าจะเริ่มทำทีละช่วง แนะนำลำดับนี้:

1. Phase 1: Core Security และ Access Control
2. Phase 3: Product Catalog และ Purchase Flow
3. Phase 5: Top-up, Wallet และ Payment Operations
4. Phase 6: Admin Console และ Operational Efficiency
5. Phase 8: Gacha Platform Stabilization
6. Phase 11: Code Quality, Testing และ Refactoring
7. Phase 12: Operations, Monitoring และ Deployment Confidence

## วิธีเลือกงานในแต่ละรอบ

- ถ้าต้องการลดความเสี่ยงก่อน ให้เลือกงานจาก Phase 1, 3, 5
- ถ้าต้องการเพิ่มความเร็วทีม ให้เลือกงานจาก Phase 6, 11
- ถ้าต้องการเพิ่มมูลค่าธุรกิจ ให้เลือกงานจาก Phase 7, 8, 10
- ถ้าต้องการให้ระบบพร้อม production มากขึ้น ให้เลือกงานจาก Phase 12

## Next Step ที่แนะนำ

งานรอบถัดไปควรเริ่มจากการแตก Phase 1 ออกเป็น task list ระดับ implementation เช่น:

1. ตรวจหน้าและ API admin ที่ยังขาด permission enforcement
2. ตรวจ mutation routes ที่ยังขาด CSRF
3. ตรวจ endpoint ที่ควรมี rate limiting
4. ระบุ test cases สำหรับ auth และ admin access
