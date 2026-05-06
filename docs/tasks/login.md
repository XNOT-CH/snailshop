# Task: ตรวจ/แก้ระบบ Login

  

## Goal

ตรวจและแก้ระบบ login ให้ใช้งานได้ถูกต้องทั้ง frontend, auth flow และการ redirect

  
## Context

- หน้าที่เกี่ยวข้อง: /login

- API ที่เกี่ยวข้อง: ถ้ามีให้ค้นจากโค้ด เช่น /api/login, /api/auth/login หรือ auth provider

- อาการที่พบ:

  - [ระบุอาการ เช่น login แล้วไม่ redirect / error ไม่ขึ้น / token ไม่ถูกเก็บ / refresh แล้วหลุด]

- Tech Stack:

  - Frontend: [ระบุ เช่น Next.js / React]

  - Backend/Auth: [ระบุ เช่น JWT / Cookie Session / NextAuth / Supabase]

  

## Expected Behavior

- เปิด /login แล้วเห็นฟอร์ม email/password

- กรอกข้อมูลผิด ต้องแสดง error message

- กรอกข้อมูลถูก ต้อง login สำเร็จ

- หลัง login สำเร็จ redirect ไป [เช่น /dashboard]

- ถ้า login แล้ว reload หน้า ต้องยังอยู่ในสถานะ logged in

- ถ้า user ยังไม่ login แล้วเข้า protected route ต้อง redirect ไป /login

- ถ้า login แล้วเข้า /login อีกครั้ง ต้อง redirect ไปหน้าหลักหรือ dashboard

  

## Test Account

- user: [snail1]

- Password: [snail1]

หรือถ้าไม่มี ให้สร้าง/mock test user สำหรับ e2e test

  

## สิ่งที่อยากให้ตรวจ

1. หาไฟล์ที่เกี่ยวกับ login/auth ทั้งหมด

2. ตรวจ component/form ของ /login

3. ตรวจ API call และ payload

4. ตรวจ response handling

5. ตรวจการเก็บ auth state เช่น cookie, token, session, localStorage

6. ตรวจ middleware/route guard/protected route

7. ตรวจ redirect flow

8. ตรวจ error handling และ validation

9. ตรวจ loading state และป้องกัน submit ซ้ำ

10. แก้ไขเมื่อพบปัญหา โดยไม่เปลี่ยน behavior อื่นที่ไม่เกี่ยวข้อง

  

## Plan

1. วิเคราะห์ requirement ก่อน

2. ค้นไฟล์ login/auth ที่เกี่ยวข้อง

3. อธิบาย flow ปัจจุบันจากโค้ด

4. ระบุปัญหาที่พบ

5. แก้ไขปัญหา

6. เพิ่มหรือปรับ test ถ้าจำเป็น

7. ตรวจด้วย Playwright

  

## Playwright Verification

ให้ตรวจ:

- /login render ได้ถูกต้อง

- login fail แสดง error

- login success redirect ถูกต้อง

- reload หลัง login แล้วยัง authenticated

- protected route redirect ไป /login เมื่อยังไม่ login

- logout แล้วเข้า protected route ไม่ได้

  

## Result

ให้สรุปผลเป็น:

- Changed:

  - ไฟล์ที่แก้

  - แก้อะไร

- Verified:

  - ทดสอบอะไรผ่านแล้วบ้าง

- Follow-up:

  - มีอะไรควรทำต่อ เช่น เพิ่ม test, ปรับ security, เพิ่ม rate limit
