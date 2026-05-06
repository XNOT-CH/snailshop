# AI Workflow: Obsidian + Playwright + GPT 5.5 High

เอกสารนี้เป็น playbook สำหรับใช้ AI ช่วยพัฒนา `my-game-store` แบบเป็นระบบ โดยให้แต่ละเครื่องมือทำหน้าที่ที่ถนัดที่สุด

## Tool Roles

| Tool | หน้าที่หลัก | ใช้เมื่อ |
| --- | --- | --- |
| Obsidian | สมุดจด context, decisions, task notes | ต้องการจำเหตุผลการตัดสินใจ, architecture, bug trail |
| Playwright | ตรวจ behavior จริงของเว็บ | หลังแก้ UI, route, auth flow, checkout, admin flow |
| GPT 5.5 High | วิเคราะห์เชิงลึกและตัดสินใจงานซับซ้อน | bug ยาก, refactor, security review, PR risk |

## Daily Loop

1. เปิด task note ใน Obsidian
   - สร้าง note ต่อหนึ่งงาน เช่น `2026-05-06-email-verification.md`
   - จดเป้าหมาย, scope, risk, commands ที่รัน, และผลลัพธ์

2. วิเคราะห์ก่อนแก้
   - อ่าน `AGENTS.md` ที่เกี่ยวข้องก่อนเสมอ
   - ใช้ `rg`, file search, และ code review ช่วยหา dependency/impact ถ้างานแตะ API, auth, admin, DB, หรือ shared lib

3. วางแผนสั้นๆ
   - ระบุไฟล์ที่จะสร้างหรือแก้
   - ระบุ test ที่ควรรัน
   - ระบุ rollback path ถ้างานเสี่ยง

4. แก้เป็นชุดเล็ก
   - แยก behavior change, UI change, migration, และ docs ออกจากกันเท่าที่ทำได้
   - หลีกเลี่ยงการลบโค้ดเดิมถ้าไม่จำเป็น

5. ตรวจด้วย test
   - Unit/integration: `npm run test`
   - E2E: `npm run test:e2e`
   - Build: `npm run build`

6. บันทึกผลกลับเข้า Obsidian
   - สรุปไฟล์ที่แก้
   - จด command output สำคัญ
   - จด follow-up หรือ known risk

## Playwright Commands

รัน dev server:

```powershell
npm run dev
```

รัน E2E:

```powershell
npm run test:e2e
```

รันแบบเปิด browser:

```powershell
npm run test:e2e:headed
```

รัน UI mode:

```powershell
npm run test:e2e:ui
```

ถ้า dev server ไม่ได้อยู่ที่ `http://127.0.0.1:3001` ให้กำหนด base URL:

```powershell
$env:PLAYWRIGHT_BASE_URL = "http://127.0.0.1:3002"
npm run test:e2e
```

## When To Use GPT 5.5 High

ใช้ reasoning สูงกับงานเหล่านี้:

- Auth/session/proxy/admin permission
- Payment, topup, slip approval, purchase locking
- DB migration หรือ schema change
- Refactor shared utilities ใน `lib/`
- PR review ที่แตะหลาย domain
- Bug ที่ต้อง trace ข้าม UI, API, DB, และ storage
- Impact review ที่ต้องอ่านหลายไฟล์ด้วย `rg`/diff/manual trace

ใช้ reasoning ปกติกับงานเหล่านี้:

- เปลี่ยน copy เล็กน้อย
- เพิ่ม test case ตรงๆ
- ปรับ CSS จำกัด scope
- อัปเดตเอกสารหรือ README

## Obsidian Note Template

~~~markdown
# Task: <short title>

## Goal

- 

## Context

- Related files:
- Related routes:
- Related docs:

## Risk

- Auth:
- DB:
- UI:
- Security:

## Plan

1. 
2. 
3. 

## Commands

```powershell

```

## Result

- Changed:
- Verified:
- Follow-up:
~~~

## Recommended Workflow By Task Type

### Bug Fix

1. จด symptom ใน Obsidian
2. ใช้ `rg` และอ่านไฟล์ใกล้เคียงเพื่อ trace flow ที่เกี่ยวข้อง
3. แก้ root cause แบบ scope แคบ
4. เพิ่ม regression test
5. รัน test ที่เกี่ยวข้องและ Playwright ถ้าแตะ UI

### New Feature

1. เขียน business requirement ให้ชัด
2. ระบุ routes, components, lib, schema ที่เกี่ยวข้อง
3. ตรวจ impact ด้วย `rg`, type references, และ tests ก่อนแตะ shared code
4. แก้เป็น vertical slice เล็ก
5. เพิ่ม test ตาม risk

### PR Review

1. อ่าน diff และไฟล์ที่แตะ
2. ตรวจ upstream/downstream impact ด้วย `rg`, imports, callers, และ route consumers
3. รัน unit/integration test ที่เกี่ยวข้อง
4. ใช้ Playwright กับ flow ที่ผู้ใช้เห็นจริง
5. จด findings และ residual risk

## Current Repo Notes

- Playwright config อยู่ที่ `playwright.config.ts`
- E2E test อยู่ที่ `tests/e2e/`
- Smoke test ปัจจุบันคือ `tests/e2e/home.spec.ts`
- Project docs อยู่ที่ `docs/`
- Root app URL ตาม README คือ `http://localhost:3001`
