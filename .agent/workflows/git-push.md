---
description: Push code changes to GitHub repository with pre-flight checks
---

# Git Push Workflow

ขั้นตอนการ commit และ push code ขึ้น GitHub พร้อม pre-flight checks

// turbo-all

## การใช้งาน
- พิมพ์ `/git-push` เพื่อ push พร้อม commit message อัตโนมัติ
- พิมพ์ `/git-push "ข้อความ commit"` เพื่อกำหนด commit message เอง

---

## ขั้นตอน

### 1. Environment Check - ตรวจสอบ Branch ปัจจุบัน
```bash
git branch --show-current
```
> ⚠️ ถ้าไม่ใช่ branch `main` หรือ `master` ให้แจ้งเตือนผู้ใช้ก่อนดำเนินการต่อ

### 2. Pre-flight Test - รัน Tests
```bash
npm test --passWithNoTests 2>&1 || echo "NO_TESTS_CONFIGURED"
```
> - ✅ ถ้า PASS: ดำเนินการขั้นตอนถัดไป
> - ❌ ถ้า FAIL: **หยุดทันที** และแจ้ง "แก้ไขโค้ดให้ผ่านเทสก่อนนะเพื่อน!"

### 3. Git Status - ตรวจสอบไฟล์ที่เปลี่ยนแปลง
```bash
git status --short
```

### 4. Stage All Changes
```bash
git add -A
```

### 5. Commit Changes
```bash
git commit -m "MESSAGE"
```
> - ถ้าผู้ใช้กำหนด MESSAGE: ใช้ข้อความที่ผู้ใช้กรอก
> - ถ้าไม่กำหนด: ใช้ `automated update: YYYY-MM-DD HH:mm:ss`

### 6. Push to Remote
```bash
git push origin BRANCH_NAME
```
> ใช้ชื่อ branch ที่ตรวจพบจากขั้นตอนที่ 1

---

## Feedback Messages

### ✅ สำเร็จ
```
🎉 Push สำเร็จ!
📦 Commit: [commit message]
🌿 Branch: [branch name]
⏰ Time: [timestamp]
```

### ❌ ล้มเหลว
```
⛔ Push ล้มเหลว!
📋 สาเหตุ: [error message]
💡 แนะนำ: [suggestion]
```
