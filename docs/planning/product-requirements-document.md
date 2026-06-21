# Product Requirements Document

โปรเจกต์: My Game Store  
สถานะเอกสาร: Draft baseline  
วันที่อัปเดต: 2026-05-22  
เจ้าของเอกสาร: Product / Engineering  
แหล่งอ้างอิงหลัก: `README.md`, `docs/project-context.md`, `docs/planning/project-requirements.md`, route structure ใน `app/`, และคำสั่งใน `package.json`

## 1. Executive Summary

My Game Store เป็นเว็บร้านขายสินค้าดิจิทัลและบัญชีเกมสำหรับตลาดไทย รองรับการสมัครสมาชิก, การเข้าสู่ระบบ, การเติมเงินด้วยสลิป, การใช้เครดิตและแต้ม, การซื้อสินค้า, การรับข้อมูลสินค้าหลังชำระเงิน, ระบบกาชา, season pass, chat/support และระบบหลังบ้านสำหรับดูแลสินค้า ผู้ใช้ คอนเทนต์ สิทธิ์ และธุรกรรมสำคัญ

เป้าหมายของ PRD นี้คือกำหนด baseline ของผลิตภัณฑ์จากระบบที่มีอยู่ เพื่อใช้คุยงานระหว่าง product, engineering, operations และ admin ก่อนเพิ่มฟีเจอร์ใหม่หรือปรับปรุง flow สำคัญ โดยให้ความสำคัญกับพฤติกรรมผู้ใช้จริง ภาษาไทย ความปลอดภัยของธุรกรรม และความสามารถในการตรวจสอบย้อนหลัง

## 2. Product Vision

สร้างแพลตฟอร์มซื้อขายสินค้าดิจิทัลที่ลูกค้าไทยใช้งานง่าย เชื่อถือได้ และผู้ดูแลร้านจัดการงานประจำวันได้รวดเร็ว ตั้งแต่การตั้งค่าสินค้า การเติมเงิน การอนุมัติสลิป การขายรหัสสินค้า ไปจนถึงกิจกรรมเพิ่ม engagement เช่น กาชา, แต้ม, referral และ season pass

## 3. Problem Statement

ลูกค้าที่ซื้อสินค้าดิจิทัลหรือบัญชีเกมต้องการประสบการณ์ที่รวดเร็วและชัดเจน: เห็นสินค้า ราคา ส่วนลด สถานะ stock วิธีเติมเงิน และข้อมูลที่ได้รับหลังซื้อ ขณะเดียวกันผู้ดูแลร้านต้องควบคุม stock, ยอดเครดิต, สลิป, สิทธิ์ admin, คอนเทนต์หน้าเว็บ และกิจกรรมส่งเสริมการขายได้จากศูนย์กลางเดียว

ความเสี่ยงหลักของธุรกิจนี้คือการขาย stock ซ้ำ, การเติมเงินซ้ำหรืออนุมัติผิดพลาด, การเข้าถึงข้อมูลลับโดยไม่ได้รับอนุญาต, การใช้ promo/แต้มผิดเงื่อนไข, และการขาด audit trail เมื่อเกิดปัญหากับธุรกรรม

## 4. Goals

1. ลูกค้าสามารถค้นหา เลือกซื้อ และรับสินค้าดิจิทัลได้อย่างมั่นใจ
2. ระบบเติมเงินด้วยสลิปต้องตรวจสอบได้ ลดความเสี่ยงจากการอนุมัติซ้ำหรือข้อมูลสลิปไม่ครบ
3. ระบบ wallet, credit, point, promo code และ tier ต้องคำนวณถูกต้องและตรวจสอบย้อนหลังได้
4. ผู้ดูแลระบบสามารถจัดการสินค้า, stock, ผู้ใช้, สิทธิ์, สลิป, กาชา, season pass และคอนเทนต์ได้จาก admin console
5. ระบบต้องบังคับ auth, permission, CSRF, validation, rate limiting และ audit log ในจุดที่มีความเสี่ยง
6. ประสบการณ์ผู้ใช้ต้องรองรับภาษาไทยและเหมาะกับตลาดไทยทั้ง desktop และ mobile

## 5. Non-Goals

1. เอกสารนี้ยังไม่กำหนดเป้ารายได้, pricing strategy, หรือ marketing campaign รายเดือน
2. เอกสารนี้ยังไม่กำหนด integration payment gateway อัตโนมัติเต็มรูปแบบ นอกเหนือจาก flow เติมเงินผ่านสลิปที่มีอยู่
3. เอกสารนี้ยังไม่แทนที่ technical design สำหรับ transaction locking, schema migration, หรือ deployment architecture
4. เอกสารนี้ไม่เปลี่ยน policy ด้าน security, CI/CD, หรือฐานข้อมูลที่มีอยู่

## 6. Target Users

### 6.1 ผู้เยี่ยมชม

ผู้ใช้ที่ยังไม่ได้เข้าสู่ระบบ ต้องสามารถดูหน้าร้าน รายละเอียดสินค้า ข่าวสาร help/FAQ และเข้าสู่ flow สมัครสมาชิกหรือเข้าสู่ระบบได้

### 6.2 สมาชิก

ผู้ใช้ที่ล็อกอินแล้ว ต้องสามารถเติมเงิน ดูยอดเครดิต/แต้ม ซื้อสินค้า ดูประวัติคำสั่งซื้อ จัดการโปรไฟล์ ใช้ promo code เล่นกาชา รับสิทธิ์ season pass และติดต่อ support/chat ได้ตามสิทธิ์ของระบบ

### 6.3 ผู้ดูแลระบบ

ผู้ใช้ที่มีสิทธิ์ admin ต้องสามารถเข้าถึง admin console เพื่อจัดการสินค้า stock ผู้ใช้ สลิป ข่าวสาร popup help navigation footer currency settings กาชา season pass chat export audit logs และ settings อื่น ๆ ตาม permission ที่กำหนด

### 6.4 Support / Operations

ผู้ใช้งานภายในที่ช่วยตรวจสลิป ดูธุรกรรม ตอบ chat ตรวจ audit log และแก้ปัญหาคำสั่งซื้อ ต้องเห็นข้อมูลที่จำเป็นโดยไม่เข้าถึงข้อมูลเกินสิทธิ์

## 7. Key User Journeys

### 7.1 Browse to Purchase

1. ผู้ใช้เปิดหน้าหลักหรือหน้าร้าน
2. ผู้ใช้ค้นหา กรอง หรือเลือกสินค้า
3. ผู้ใช้เปิดหน้ารายละเอียดสินค้าเพื่อตรวจราคา ส่วนลด และสถานะ stock
4. ผู้ใช้เพิ่มสินค้าใน cart หรือซื้อสินค้า
5. ระบบตรวจ session, ยอดเครดิต, stock, promo code และราคา
6. ระบบสร้าง order หักยอดเครดิต และส่งมอบข้อมูลสินค้าดิจิทัลที่ถูกต้อง
7. ผู้ใช้ดูประวัติคำสั่งซื้อและข้อมูลที่ได้รับใน dashboard

### 7.2 Top-up by Slip

1. สมาชิกเปิดหน้าเติมเงิน
2. สมาชิกกรอกจำนวนเงินและอัปโหลดสลิป
3. ระบบ validate จำนวนเงิน ไฟล์ และข้อมูลที่จำเป็น
4. ระบบสร้าง top-up request ในสถานะรอตรวจสอบ
5. Admin ตรวจสอบสลิปจาก admin console
6. Admin อนุมัติหรือปฏิเสธรายการ
7. เมื่ออนุมัติ ระบบเพิ่มเครดิตให้สมาชิกและบันทึกสถานะธุรกรรม

### 7.3 Admin Product Management

1. Admin เปิดหน้า products ใน admin console
2. Admin สร้างหรือแก้ไขสินค้า ราคา หมวดหมู่ รูปภาพ สถานะ featured/sale และ stock
3. ระบบ validate input และป้องกัน stock ซ้ำตามกฎของระบบ
4. Admin สามารถ duplicate, จัดการ stock, ตั้งค่า auto-delete หลังขาย หรือย้ายเข้าถังขยะได้ตามสิทธิ์
5. การเปลี่ยนแปลงสำคัญควรถูกบันทึก audit log

### 7.4 Gacha Engagement

1. สมาชิกเปิดหน้ากาชาหรือกาชา grid
2. ระบบแสดงตู้กาชาที่เปิดใช้งาน ราคา/ต้นทุน และ reward information ตามที่เผยแพร่ได้
3. สมาชิกกดเล่น ระบบตรวจ daily limit, cost type, credit/point balance และ eligibility
4. ระบบคำนวณผลรางวัลตาม logic ของตู้และบันทึก roll log
5. สมาชิกเห็นผลลัพธ์ ประวัติ และ recent feed ตาม flow ที่กำหนด

### 7.5 Season Pass

1. สมาชิกเปิดหน้า season pass
2. ระบบแสดงแผน สิทธิ์ reward สถานะการซื้อ และสถานะการ claim
3. สมาชิกซื้อหรือ claim reward ตามเงื่อนไข
4. ระบบบันทึก transaction และป้องกันการ claim ซ้ำ
5. Admin สามารถจัดการ plan, rewards และ logs ได้

## 8. Functional Requirements

### 8.1 Authentication and Account

- ระบบต้องรองรับการสมัครสมาชิก เข้าสู่ระบบ ออกจากระบบ ลืมรหัสผ่าน รีเซ็ตรหัสผ่าน และยืนยันอีเมล
- Session ต้องผูกกับ user id และ role ที่ใช้งานจริงใน authorization
- หน้า dashboard, profile, wallet, inventory, topup และ season pass ต้องเข้าถึงได้เฉพาะผู้ใช้ที่มีสิทธิ์
- ระบบต้องไม่เชื่อ user id, role, permission หรือ balance ที่ส่งมาจาก client
- Error message ต้องเข้าใจง่ายสำหรับผู้ใช้ไทยและไม่เปิดเผยข้อมูลภายในเกินจำเป็น

### 8.2 Storefront and Product Catalog

- ระบบต้องแสดงหน้าหลัก หน้าร้าน รายละเอียดสินค้า สินค้าแนะนำ และสินค้าลดราคา
- สินค้าต้องรองรับราคาเต็ม ราคาลด หมวดหมู่ รูปภาพ สถานะขายได้ และลำดับการแสดงผล
- ผู้ใช้ต้องเห็นสถานะสินค้าที่เกี่ยวข้องก่อนซื้อ เช่น พร้อมขาย หมด stock หรือไม่พร้อมขาย
- การแสดงราคาและสกุลเงินต้องใช้ค่าตั้งค่าของระบบเมื่อมี currency settings
- หน้า public content เช่น news, help, nav items, footer และ popup ต้องดึงจาก content/settings ที่ admin จัดการได้

### 8.3 Cart, Checkout, and Purchase

- สมาชิกต้องเพิ่มสินค้าใน cart และ checkout ได้
- ระบบต้อง validate stock, ราคา, discount, promo code, credit balance และสถานะสินค้าในฝั่ง server ก่อนสร้าง order
- ระบบต้องหักเครดิตและส่งมอบข้อมูลสินค้าใน transaction ที่ลดโอกาส race condition
- Order ต้องเก็บ user id, product data ที่จำเป็น, given data, total price, status และเวลาซื้อ
- ระบบต้องป้องกันการซื้อ stock เดียวกันซ้ำหรือการรับข้อมูลสินค้าที่ไม่ได้ซื้อ
- ระบบควรมี reconciliation หรือ operational check สำหรับธุรกรรม commerce ที่สำคัญ

### 8.4 Product Codes and Stock

- Admin ต้องจัดการ stock หรือข้อมูลลับของสินค้าได้
- ระบบต้องรองรับการ import หรือเพิ่มรหัสสินค้าแบบหลายรายการตามรูปแบบที่กำหนด
- ระบบต้อง validate duplicate stock หรือ username ซ้ำตาม rule ปัจจุบัน
- ข้อมูลลับของสินค้าและ stock ต้องไม่แสดงต่อผู้ใช้ก่อนซื้อ
- เมื่อซื้อสำเร็จ ระบบต้อง assign stock ให้ order อย่างถูกต้องและตรวจสอบย้อนหลังได้
- Auto-delete หลังขายต้องทำงานตามค่าที่ admin ตั้งไว้และไม่ลบข้อมูลที่ยังจำเป็นต่อ audit หรือ order history

### 8.5 Wallet, Credit, Point, and Top-up

- สมาชิกต้องมียอด credit balance และ point balance
- สมาชิกต้องส่งคำขอเติมเงินพร้อมจำนวนเงินและหลักฐานสลิปได้
- ระบบต้องเก็บสถานะ top-up เช่น pending, approved, rejected ตาม flow ที่ใช้งาน
- Admin ต้องอนุมัติหรือปฏิเสธสลิปได้จาก admin console
- การอนุมัติต้องเพิ่มเครดิตเพียงครั้งเดียวต่อรายการ และต้องป้องกัน duplicate approval
- ระบบต้องเก็บข้อมูลอ้างอิงที่จำเป็น เช่น transaction reference, sender bank หรือข้อมูลตรวจสอบสลิปเท่าที่มี
- ไฟล์สลิปต้องถูกเก็บในพื้นที่ที่เหมาะสมและเข้าถึงได้เฉพาะผู้มีสิทธิ์

### 8.6 Promo Codes

- Admin ต้องสร้าง แก้ไข และปิดใช้งาน promo code ได้
- Promo code ต้องรองรับส่วนลดแบบ percentage และ fixed amount ตามข้อมูลที่ระบบมี
- ระบบต้องตรวจ usage limit, วันหมดอายุ, สถานะใช้งาน และเงื่อนไขอื่นก่อนคำนวณราคา
- Checkout ต้องคำนวณส่วนลดฝั่ง server และไม่เชื่อยอดรวมที่ client ส่งมา
- ระบบควรบันทึกการใช้ promo code เพื่อ audit และป้องกันการใช้เกินสิทธิ์

### 8.7 User Dashboard and Profile

- สมาชิกต้องเห็นภาพรวมบัญชี ยอดเครดิต แต้ม ประวัติซื้อ ประวัติเติมเงิน และข้อมูลที่เกี่ยวข้อง
- สมาชิกต้องแก้ไข profile/settings ได้ตาม field ที่อนุญาต
- ระบบต้องรองรับข้อมูลที่อยู่หรือ profile data ที่เกี่ยวข้องกับธุรกิจโดยไม่เปิดให้แก้ไขสิทธิ์หรือยอดเงิน
- Dashboard ต้องมี loading, empty, และ error states ที่ชัดเจน

### 8.8 Membership Tier and Referral

- ระบบต้องคำนวณ tier จากยอดใช้งานหรือเงื่อนไขที่กำหนด
- ระบบต้องรองรับ badge หรือสถานะพิเศษ เช่น verified หรือ influencer เมื่อมีข้อมูล
- Referral ต้องมีมาตรการลด abuse เช่น IP limit หรือ rule อื่นตาม implementation
- แต้ม referral หรือ reward ต้องถูกเพิ่มจากฝั่ง server เท่านั้น

### 8.9 Gacha

- Admin ต้องสร้าง แก้ไข duplicate reorder และปิด/เปิดตู้กาชาได้
- ตู้กาชาต้องรองรับ cost type เช่น free, credit และ point
- ตู้กาชาต้องกำหนด daily spin limit และ reward probability ได้
- Reward ต้องรองรับประเภท product, credit และ point ตาม schema ปัจจุบัน
- ระบบต้องบันทึกประวัติการหมุน รายละเอียด cost tier selector label และผลลัพธ์ที่จำเป็น
- ระบบต้องแสดงประวัติของผู้ใช้และ recent feed ตาม permission และ privacy ที่เหมาะสม
- Gacha Grid / SPIN_X ต้องคำนวณผลจาก selector/path intersection ตาม logic ในระบบ

### 8.10 Season Pass

- ระบบต้องมีหน้า public/member สำหรับ season pass และหน้า admin สำหรับจัดการ plan/reward/logs
- สมาชิกต้องซื้อ season pass หรือ claim reward ได้ตามเงื่อนไข
- ระบบต้องป้องกัน duplicate claim และตรวจสิทธิ์จาก server
- Admin ต้อง upload image หรือจัดการ reward assets ได้ตาม route ที่มีอยู่
- Logs ต้องช่วยตรวจสอบการซื้อและรับ reward ย้อนหลังได้

### 8.11 Chat and Support

- สมาชิกต้องส่งข้อความหรือไฟล์ภาพใน chat ได้ตามข้อจำกัดของระบบ
- Admin ต้องดู conversations, messages, read state, templates และ media ที่เกี่ยวข้องได้
- ระบบต้องมี cleanup สำหรับ image ที่หมดอายุหรือไม่ควรเก็บถาวร
- Chat media ต้องตรวจสิทธิ์ก่อนเข้าถึงทุกครั้ง

### 8.12 Content Management

- Admin ต้องจัดการ news, help articles, help videos, popups, nav items, footer links, footer widget settings และ site settings ได้
- Popup ต้องรองรับพฤติกรรมการแสดงซ้ำตาม dismiss option ที่กำหนด
- Navigation และ footer ต้องเรียงลำดับและเปิด/ปิดได้
- Public pages ต้องมี fallback state เมื่อยังไม่มี content
- Thai copy ต้องรักษาความถูกต้องและไม่เกิดปัญหา encoding

### 8.13 Admin Console and Permissions

- Admin console ต้องแสดงเมนูตามสิทธิ์ และ API ต้องบังคับสิทธิ์ซ้ำในฝั่ง server
- Permission source of truth ต้องสอดคล้องกับ `users.role` และ helper ในระบบ
- Mutation routes ของ admin ต้องใช้ CSRF protection
- หน้า admin ต้องเหมาะกับงาน operation: dense, scannable, มี feedback และ confirmation สำหรับ action ที่เสี่ยง
- Admin ต้องเข้าถึง audit logs และ export ได้ตามสิทธิ์

### 8.14 Audit, Export, and Operations

- ระบบต้องบันทึกกิจกรรมสำคัญ เช่น auth, admin changes, top-up approval, purchase, stock change และ security-relevant actions เท่าที่ implementation รองรับ
- Export ต้องจำกัดตาม permission และไม่เปิดเผยข้อมูลลับเกินความจำเป็น
- Operational scripts เช่น deploy readiness, DB health, purchase locking, commerce reconciliation และ encoding check ต้องใช้เป็นส่วนหนึ่งของ workflow เมื่อเกี่ยวข้อง

## 9. Non-Functional Requirements

### 9.1 Performance

- หน้า storefront หลักควรโหลดเร็วพอสำหรับผู้ใช้ mobile ในไทย
- API ที่ใช้ใน checkout, top-up, gacha และ dashboard ต้องตอบสนองสม่ำเสมอและจัดการ error ได้ชัดเจน
- รูปภาพสินค้า popup banner และ content images ควรมี fallback และขนาดที่เหมาะสม

### 9.2 Reliability

- ธุรกรรมการซื้อ เติมเงิน claim reward และกาชาต้องออกแบบให้ลด double-spend, double-claim และ duplicate approval
- ระบบต้องมี health check และ deploy readiness check สำหรับตรวจสภาพแวดล้อม
- งานที่ต้องพึ่ง scheduled job เช่น auto-delete หรือ cleanup ต้องมีวิธีรันและตรวจสอบผล

### 9.3 Security

- ระบบต้องใช้ authentication และ authorization ทุกจุดที่เข้าถึงข้อมูลส่วนตัว ข้อมูลลับ หรือ action ฝั่ง admin
- Mutation APIs ต้องใช้ CSRF protection ตาม pattern ของโปรเจกต์
- Input ทุกชนิดต้อง validate ฝั่ง server โดยเฉพาะราคา จำนวนเงิน stock user id role permission file upload และ route params
- Rate limiting ต้องใช้กับ endpoint ที่เสี่ยง เช่น login, register, top-up, purchase, gacha roll และ chat upload ตามความเหมาะสม
- Secret, env values, slip files, private uploads และ product secret data ต้องไม่ถูกเปิดเผยต่อ public route
- Audit log ต้องช่วยไล่เหตุการณ์สำคัญเมื่อเกิด dispute หรือ incident

### 9.4 Maintainability

- โค้ดต้องใช้ Next.js App Router, TypeScript, Drizzle ORM, validation helpers และ project helpers ตาม pattern เดิม
- Business logic สำคัญควรถูกแยกไว้ใน `lib/` หรือ `lib/features/` เพื่อทดสอบได้
- API response shape ควรรักษา compatibility กับ consumer เดิม
- เอกสารและข้อความภาษาไทยต้องเป็น UTF-8 และผ่าน encoding check

### 9.5 Accessibility and UX

- ฟอร์มสำคัญต้องมี label, validation message, disabled/loading state และ error state ที่เข้าใจง่าย
- ปุ่ม action เสี่ยงต้องมี confirmation หรือ state ที่ลดการกดซ้ำ
- หน้าร้านและ dashboard ต้องใช้งานได้บน mobile และ desktop
- UI หลังบ้านควรเน้นความชัดเจน ความเร็วในการค้นหา และลดการคลิกซ้ำ

## 10. Data Requirements

ระบบต้องจัดเก็บและสัมพันธ์ข้อมูลหลักอย่างน้อยในกลุ่มต่อไปนี้:

- Users, sessions, roles, permissions และ audit logs
- Products, product codes/stock, orders และ purchase history
- Top-ups, proof images, transaction references และ approval state
- Promo codes, usage tracking และ discount metadata
- Credit balance, point balance, lifetime points และ membership tier inputs
- Gacha categories, machines, rewards, settings และ roll logs
- Season pass plan, rewards, purchases/transactions และ claim logs
- News, help articles, help videos, popup settings, nav items, footer links, currency settings และ site settings
- Chat conversations, messages, read state, templates และ media metadata

ข้อมูลที่เป็นความลับ เช่น product secret data, slip images, private uploads และ sensitive user data ต้องมี access control ชัดเจน และไม่ควรอยู่ใน response ของ public API โดยไม่จำเป็น

## 11. Analytics and Success Metrics

### 11.1 Suggested Business Metrics

- จำนวนสมาชิกใหม่ต่อวัน/สัปดาห์
- Conversion จาก product detail ไป purchase
- มูลค่า top-up และ purchase ต่อวัน
- Approval time เฉลี่ยของสลิป
- จำนวน order ที่สำเร็จ ล้มเหลว หรือ refund/dispute
- Promo code usage และ conversion
- Gacha spins, repeat spins และ reward distribution
- Season pass purchase rate และ claim rate
- จำนวน chat/support conversations และเวลาตอบกลับ

### 11.2 Suggested Operational Metrics

- จำนวน top-up pending เกิน SLA
- จำนวน purchase error หรือ stock assignment error
- จำนวน duplicate stock ที่ถูก block
- จำนวน auth/permission failure ที่ผิดปกติ
- API error rate สำหรับ checkout, top-up, gacha และ admin mutation
- ผลลัพธ์จาก `npm run check:db-health`, `npm run check:purchase-locking`, `npm run check:deploy` และ reconciliation scripts

## 12. Acceptance Criteria

### 12.1 Customer Purchase Path

- ผู้ใช้สมัครและเข้าสู่ระบบได้
- ผู้ใช้ดูสินค้าและรายละเอียดสินค้าได้
- ผู้ใช้ซื้อสินค้าได้เมื่อมีเครดิตเพียงพอและสินค้ามี stock
- ระบบหักเครดิต สร้าง order และส่งข้อมูลสินค้าให้เฉพาะผู้ซื้อ
- ระบบปฏิเสธการซื้อเมื่อเครดิตไม่พอ สินค้าหมด ราคาไม่ valid หรือ session ไม่ถูกต้อง

### 12.2 Top-up Path

- ผู้ใช้ส่งคำขอเติมเงินพร้อมสลิปได้เมื่อข้อมูลถูกต้อง
- Admin เห็นรายการ pending และดูหลักฐานได้ตามสิทธิ์
- การอนุมัติรายการเพิ่มเครดิตให้ผู้ใช้เพียงครั้งเดียว
- การปฏิเสธรายการไม่เพิ่มเครดิต
- ระบบเก็บสถานะและข้อมูล audit ที่จำเป็น

### 12.3 Admin Control Path

- Admin ที่มีสิทธิ์เห็นเมนูและใช้งาน API ที่เกี่ยวข้องได้
- ผู้ใช้ที่ไม่มีสิทธิ์ถูกปฏิเสธทั้งในหน้า UI และ API
- Admin จัดการสินค้า stock promo content gacha season pass และ settings ได้ตาม scope
- Mutation สำคัญต้องผ่าน CSRF และ validation

### 12.4 Gacha Path

- สมาชิกเห็นตู้กาชาที่ active ได้
- ระบบตรวจ cost, balance, daily limit และ eligibility ก่อน roll
- Roll ที่สำเร็จสร้าง log และให้ reward ตาม logic
- Roll ที่ไม่ผ่านเงื่อนไขต้องไม่หัก credit/point
- Admin ตั้งค่า machine/reward ได้โดยไม่ทำให้ probability หรือ reward state ขัดแย้ง

### 12.5 Content Path

- Admin จัดการ news help popup nav footer และ settings ได้
- Public pages แสดง content ที่ active และ fallback เมื่อไม่มีข้อมูล
- Thai text ไม่เสีย encoding

## 13. Release and Verification Strategy

ใช้คำสั่งตรวจเท่าที่สัมพันธ์กับงาน:

- Docs/text-only: `npm run check:encoding`
- Shared TypeScript หรือ business logic: `npm run test` และ `npm run lint`
- API, auth, checkout, admin หรือ user-facing UI: `npm run test`, `npm run build`, และ `npm run test:e2e` เมื่อ practical
- Purchase locking, stock handoff หรือ checkout locking: เพิ่ม `npm run check:purchase-locking`
- Deployment/config: `npm run check:deploy`, `npm run cf:check`, `npm run cf:preview` หรือ `npm run cf:deploy` ตามงานจริง
- Database migration: อ่าน `drizzle/README.md` ก่อน แล้วใช้ `npm run db:migrate` หรือ dev-only `npm run db:push` ตาม flow ที่ถูกต้อง

## 14. Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Stock ถูกขายซ้ำ | ลูกค้าได้รับข้อมูลซ้ำหรือร้านเสียเครดิต | ใช้ server-side validation, transaction/locking, purchase locking check และ test เฉพาะ flow |
| อนุมัติ top-up ซ้ำ | เครดิตเกินจริงและ reconciliation ยาก | บังคับ state transition ฝั่ง server, idempotency guard และ audit log |
| Permission mismatch ระหว่าง UI กับ API | ผู้ใช้เข้าถึง action เกินสิทธิ์ | ตรวจทั้ง admin sidebar, admin access mapping, middleware และ API auth helper |
| ข้อมูลลับรั่วผ่าน public API | กระทบความปลอดภัยและความเชื่อมั่น | จำกัด response shape, ตรวจ route access, ใช้ private storage และ tests |
| Promo/price ถูกแก้จาก client | รายได้สูญเสีย | คำนวณราคาและส่วนลดฝั่ง server เท่านั้น |
| Gacha probability ผิดหรือ reward ไม่ตรง | กระทบความเชื่อมั่นและต้นทุน reward | แยก logic ให้ test ได้, บันทึก roll log และมี admin validation |
| Thai text encoding เสีย | UX เสียและแก้ยาก | ใช้ UTF-8 และรัน `npm run check:encoding` สำหรับงานเอกสาร |

## 15. Roadmap Proposal

### Phase 0: Baseline and Documentation

- ใช้ PRD นี้เป็น baseline ร่วมกับ `project-requirements.md` และ `project-roadmap.md`
- ระบุเจ้าของ feature และ priority ของแต่ละ module
- เติม open questions ที่ product/admin ต้องตอบ

### Phase 1: Core Commerce Hardening

- ตรวจ purchase, checkout, stock assignment และ promo code
- เพิ่ม test สำหรับ edge case ที่เสี่ยง
- รัน purchase locking check เมื่อแตะ logic ที่เกี่ยวข้อง

### Phase 2: Top-up and Wallet Reliability

- ตรวจ top-up request, slip validation, approval/rejection และ duplicate approval
- ปรับ admin feedback และ audit trail ให้ใช้งานง่ายขึ้น
- ทำ reconciliation report สำหรับรายการที่ผิดปกติ

### Phase 3: Admin Efficiency

- ปรับปรุงหน้า admin ที่ใช้บ่อย เช่น products, slips, users, gacha และ content
- ลด permission mismatch และเพิ่ม empty/error states
- เพิ่ม export/report ที่ operations ใช้จริง

### Phase 4: Engagement Platform

- ทำให้ gacha, season pass, referral และ point system มี acceptance criteria ชัดเจน
- ตรวจ probability, reward cost และ abuse prevention
- เพิ่ม metrics สำหรับ engagement และ reward liability

### Phase 5: Launch Readiness

- ตรวจ deploy readiness, DB health, encoding, E2E และ smoke test
- เตรียม runbook สำหรับ top-up dispute, purchase dispute, stock issue และ incident
- สรุป operational dashboard หรือ checklist สำหรับ admin

## 16. Open Questions

1. ชื่อ brand ที่ใช้จริงควรเป็น My Game Store หรือ ManaShop ในทุกหน้าสาธารณะและเอกสาร
2. SLA การอนุมัติสลิปควรเป็นกี่นาทีหรือกี่ชั่วโมง
3. นโยบาย refund, dispute และการแก้ไข order หลังขายควรเป็นอย่างไร
4. สินค้าดิจิทัลแต่ละประเภทต้องมี field เฉพาะอะไรเพิ่มเติม เช่น region, platform, warranty หรือ delivery note
5. ต้องการ payment gateway อัตโนมัติในอนาคตหรือยังคงใช้สลิปเป็นหลัก
6. Tier, point, referral และ season pass ควรมี business rule กลางที่ product sign-off แล้วหรือไม่
7. Gacha ต้องแสดง drop rate ต่อผู้ใช้ระดับใด และต้องมีข้อกำกับทางกฎหมาย/ความโปร่งใสเพิ่มเติมหรือไม่
8. Chat media ควรเก็บนานเท่าใด และ policy การลบข้อมูลส่วนบุคคลคืออะไร
9. Admin แต่ละ role ควรมี permission matrix ที่ product/ops รับรองแล้วหรือยัง
10. Metrics ใดคือ KPI หลักของ launch หรือ iteration ถัดไป

## 17. Related Documents

- `docs/project-context.md`
- `docs/project-structure.md`
- `docs/planning/project-requirements.md`
- `docs/planning/project-roadmap.md`
- `docs/planning/shop-testing-plan.md`
- `docs/runbooks/launch-checklist.md`
