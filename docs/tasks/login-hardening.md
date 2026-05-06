อ่าน docs/tasks/login-hardening.md แล้วทำตาม workflow นี้ ตรวจ/แก้ Login Hardening ให้จบ รวม unit test, build, lint และ Playwright ด้วย

เริ่มจากวิเคราะห์ flow ปัจจุบันก่อน:
- อธิบาย login/auth/session/route guard flow จากโค้ดจริง
- ระบุปัญหาหรือความเสี่ยงที่พบ
- สรุปไฟล์ที่จะสร้างหรือแก้ก่อนแตะโค้ด

สิ่งที่ต้องตรวจ:
- rate limit login ทั้ง user/IP
- progressive delay หลัง login ผิดหลายครั้ง
- Turnstile production config
- E2E Turnstile bypass ต้องใช้ได้เฉพาะ test mode เท่านั้น
- cookie/session security flags
- callbackUrl/open redirect ทุกเส้นทาง
- logout ต้องล้าง session/cookie ถูกต้อง
- audit log สำหรับ login success/fail/logout
- admin protected route และ permission redirect
- เพิ่มหรือปรับ unit/e2e tests ถ้าจำเป็น
- Playwright ต้องครอบคลุม login fail, login success, reload session, protected route redirect, logout, malicious callbackUrl

หลังแก้ให้รัน:
- npm run lint
- npm run build
- npx vitest run tests/lib/login.test.ts tests/api/login.test.ts
- npx playwright test tests/e2e/login.spec.ts --project=chromium

สรุปผลท้ายงานเป็น:
- Changed
- Verified
- Remaining risks / Follow-up
