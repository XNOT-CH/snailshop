# 🎮 ManaShop - Game Store E-Commerce Platform

## Overview
นี่คือโปรเจกต์ **ร้านขายเกมออนไลน์ (Game Store)** พัฒนาด้วย Next.js 16 + TypeScript สำหรับตลาดไทย รองรับระบบสมาชิก, เติมเงิน, ซื้อสินค้าดิจิตอล (Game Keys/Digital Codes) และระบบ Point สะสม

---

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 16.1.3 (App Router) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 4 |
| **Database** | MySQL via Drizzle ORM + mysql2 |
| **Cache** | Upstash Redis |
| **Auth** | NextAuth v5 (Credentials) + JWT session |
| **UI Components** | Radix UI + shadcn/ui |
| **Animation** | Framer Motion |
| **Forms** | React Hook Form + Zod |
| **Charts** | Recharts |
| **Testing** | Vitest + Testing Library |

---

## Project Structure

```
my-game-store/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes (REST)
│   │   ├── admin/        # Admin-only APIs (31 routes)
│   │   ├── cart/         # Shopping cart API
│   │   ├── login/        # Authentication
│   │   ├── register/     # User registration
│   │   ├── topup/        # Balance top-up
│   │   ├── purchase/     # Product purchase
│   │   ├── products/     # Product listing
│   │   ├── popups/       # Welcome popup management
│   │   └── ...           # Other APIs (~18 modules)
│   │
│   ├── admin/            # Admin Dashboard Pages
│   │   ├── products/     # จัดการสินค้า
│   │   ├── users/        # จัดการผู้ใช้
│   │   ├── slips/        # อนุมัติสลิปเติมเงิน
│   │   ├── product-codes/# คลังรหัสสินค้า
│   │   ├── promo-codes/  # โค้ดส่วนลด
│   │   ├── category-banners/ # แบนเนอร์หมวดหมู่
│   │   ├── referral/     # ตั้งค่า Referral
│   │   ├── roles/        # จัดการยศ/สิทธิ์
│   │   ├── popup-settings/ # จัดการ Popup
│   │   ├── gacha-machines/ # จัดการตู้กาชา
│   │   ├── gacha-grid/   # ตั้งค่า Gacha Grid (SPIN_X)
│   │   ├── gacha-settings/ # ตั้งค่าระบบกาชา
│   │   └── settings/     # ตั้งค่าร้าน
│   │
│   ├── dashboard/        # User Dashboard
│   ├── shop/             # หน้าร้านค้า
│   ├── product/          # หน้ารายละเอียดสินค้า
│   ├── gacha/            # หน้าตู้กาชา (list)
│   ├── gacha-grid/       # หน้า Gacha Grid game (SPIN_X)
│   ├── gachapons/        # หน้า Gachapon (รายเครื่อง)
│   ├── login/            # หน้าล็อกอิน
│   ├── register/         # หน้าสมัครสมาชิก
│   └── profile/          # หน้าโปรไฟล์
│
├── components/           # React Components
│   ├── ui/              # shadcn/ui components (54 files)
│   ├── admin/           # Admin-specific components
│   ├── cart/            # Cart components
│   ├── animations/      # Animation components (FadeIn)
│   ├── GachaRhombus.tsx     # ตู้กาชา Grid แบบ rhombus
│   ├── GachaGridMachine.tsx # ตัว Machine wrapper
│   ├── GachaResultModal.tsx # Modal แสดงผลรางวัล
│   ├── GachaRecentFeed.tsx  # Feed รางวัลล่าสุด (live)
│   ├── GachaHistory.tsx     # ประวัติการหมุน
│   ├── Navbar.tsx       # แถบนำทาง
│   ├── Footer.tsx       # Footer
│   ├── ProductCard.tsx  # การ์ดสินค้า
│   ├── WelcomePopup.tsx # Popup ต้อนรับ
│   └── ...              # Other components
│
├── lib/                 # Utilities & Libraries
│   ├── db/             # Drizzle DB (mysql2 pool + schema)
│   │   ├── index.ts     # DB client (drizzle)
│   │   └── schema.ts    # DB schema (Drizzle)
│   ├── auth.ts         # Authorization helpers (isAdmin, isAuthenticated, +CSRF variants)
│   ├── gachaGrid.ts    # Gacha Grid logic (buildGrid, INTERSECTION_MAP, tier paths)
│   ├── autoDelete.ts   # Product auto-delete scheduler logic
│   ├── stock.ts        # Stock validation (username uniqueness, duplicate prevention)
│   ├── session.ts      # Custom session helpers (มีอยู่ แต่ระบบหลักใช้ NextAuth)
│   ├── permissions.ts  # RBAC permissions
│   ├── tierHelpers.ts  # User tier calculation
│   ├── rateLimit.ts    # Rate limiting (in-memory; Redis เป็น optional)
│   ├── redis.ts        # Upstash Redis client (optional)
│   ├── auditLog.ts     # Activity logging
│   └── ...             # Other utilities
│
└── types/              # TypeScript types
```

---

## Database Schema (Key Models)

### Users & Authentication
- **User** - ผู้ใช้งาน (creditBalance, pointBalance, lifetimePoints, totalTopup, role, permissions[])
- **Role** - ยศ/สิทธิ์ UI-only (code, name, iconUrl, permissions[])
  > ⚠️ Source of truth คือ `users.role` (varchar) ไม่ใช่ Role table
- **Session** - Session management (token, expiresAt, lastActivity, ipAddress)
- **ApiKey** - API Keys สำหรับ External Access
- **AuditLog** - บันทึกกิจกรรม (action, resource, resourceId, status)

### Products & Orders
- **Product** - สินค้า (price, discountPrice, category, currency, secretData, isSold, isFeatured, sortOrder)
  - `autoDeleteAfterSale` - จำนวนนาทีก่อนลบหลังขาย (null = ไม่ลบ)
  - `scheduledDeleteAt` - เวลาที่กำหนดลบ
  - `stockSeparator` - delimiter สำหรับแบ่ง stock items (`newline` | custom)
- **Order** - คำสั่งซื้อ (userId, givenData, totalPrice, status, purchasedAt)
- **PromoCode** - โค้ดส่วนลด (PERCENTAGE/FIXED, usageLimit, expiresAt)

### Payments & Balance
- **Topup** - รายการเติมเงิน (amount, proofImage, status, transactionRef, senderBank)

### Content Management
- **SiteSettings** - ตั้งค่าเว็บไซต์ (hero, banners x3, logo, backgroundImage)
- **AnnouncementPopup** - Welcome popup carousel (dismissOption: show_always/once/daily)
- **NewsArticle** - ข่าวสาร/โปรโมชั่น
- **HelpArticle** - ศูนย์ช่วยเหลือ (FAQ)
- **CategoryBanner** - แบนเนอร์หมวดหมู่
- **NavItem** - รายการเมนู (label, href, icon, sortOrder)
- **FooterLink** - ลิงก์ใน footer
- **FooterWidgetSettings** - ตั้งค่า footer widget
- **CurrencySettings** - ตั้งค่าสกุลเงินพิเศษ (name, symbol, code)

### Gacha System
- **GachaCategory** - หมวดหมู่ตู้กาชา
- **GachaMachine** - ตู้กาชา (gameType: `SPIN_X`, costType: `FREE`/`CREDIT`/`POINT`, dailySpinLimit, tierMode)
- **GachaSettings** - ตั้งค่าระบบกาชา global (singleton: id=`default`)
- **GachaReward** - รางวัลในตู้กาชา (rewardType: `PRODUCT`/`CREDIT`/`POINT`, tier: `common`/`rare`/`epic`/`legendary`, probability)
- **GachaRollLog** - ประวัติการหมุน (userId, gachaMachineId, tier, selectorLabel, costAmount)

---

## Key Features

### 🛒 E-Commerce
- **Product Catalog** - รายการสินค้าพร้อม filters/search
- **Product Codes** - ระบบคลังรหัสเกม (auto-assign เมื่อซื้อ)
- **Shopping Cart** - ตะกร้าสินค้า
- **Promo Codes** - ส่วนลดด้วยโค้ด

### 💰 Payment & Balance
- **Credit Balance** - ยอดเงินในระบบ
- **Point System** - ระบบ Point สำหรับแลกสินค้าพิเศษ
- **Top-up** - เติมเงินผ่านสลิปโอนเงิน (manual approval)
- **Bank Settings** - ตั้งค่าบัญชีธนาคารรับเงิน

### 👤 User System
- **Registration/Login** - สมัคร/ล็อกอิน
- **User Tiers** - Bronze, Silver, Gold, Diamond, Legend (based on spending)
- **Special Badges** - Verified, Influencer badges
- **Referral System** - เชิญเพื่อนรับ Point (มี anti-abuse: IP limit)
- **Profile Settings** - ตั้งค่าโปรไฟล์, ที่อยู่จัดส่ง, ใบกำกับภาษี

### 🎰 Gacha System
- **Gacha Machines** - ระบบตู้กาชา หลายเครื่อง แต่ละเครื่องตั้งค่าต้นทุน/รางวัลได้
- **Game Type SPIN_X** - เกม Rhombus Grid แบบ diamond (เลือก L selector + R selector ได้ intersection)
- **Tier System** - 4 ระดับรางวัล: common → rare → epic → legendary
- **Cost Types** - FREE / CREDIT / POINT ต่อ machine
- **Daily Spin Limit** - จำกัดจำนวนหมุนต่อวันต่อ machine
- **Recent Feed** - แสดงผลหมุนล่าสุด real-time
- **Roll History** - ประวัติการหมุนของแต่ละ user
- **Admin Gacha** - CRUD machines, rewards, categories, settings

### 🔐 Admin Panel
- **Dashboard** - สรุปยอดขาย/สถิติ
- **Product Management** - CRUD สินค้า (รองรับ auto-delete หลังขาย)
- **Product Code Management** - จัดการ/Import รหัสเกม (ป้องกัน username ซ้ำ)
- **User Management** - จัดการผู้ใช้, ยศ, badges
- **Slip Approval** - อนุมัติสลิปเติมเงิน
- **Role & Permissions** - ระบบยศและสิทธิ์
- **Gacha Management** - จัดการตู้กาชา, rewards, categories
- **Site Settings** - ตั้งค่าเว็บไซต์ทั้งหมด

### 🎨 Frontend Features
- **Hero Banner** - แบนเนอร์หลัก (carousel)
- **Featured Products** - สินค้าแนะนำ
- **Sale Products** - สินค้าลดราคา
- **Category Banners** - แบนเนอร์หมวดหมู่
- **Welcome Popup** - Popup ต้อนรับ (carousel, dismissable)
- **News Section** - ข่าวสาร/โปรโมชั่น
- **Dark Mode** - รองรับ Theme สว่าง/มืด
- **Animations** - FadeIn effects (Framer Motion)

---

## Running the Project

```bash
# Install dependencies
npm install

# Setup database
npm run db:push
# or
npm run db:migrate

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run tests with coverage (for SonarQube)
npm run test:coverage
```

### Local services (optional)

```bash
# Start SonarQube + Postgres (Sonar DB) + MySQL (app DB)
docker compose up -d
```

---

## Environment Variables

```env
# Database
DATABASE_URL="mysql://..."

# Auth (NextAuth v5)
# Generate with: npx auth secret
AUTH_SECRET="..."
AUTH_URL="http://localhost:3000"
AUTH_TRUST_HOST=true

# Security
ENCRYPTION_KEY="32-bytes-exactly"
CSRF_SECRET="..."

# Redis (Upstash)
UPSTASH_REDIS_REST_URL="..."
UPSTASH_REDIS_REST_TOKEN="..."

# CORS allowed origin (API)
ALLOWED_ORIGIN="..."
```

> หมายเหตุ: ใน production ระบบจะต้องมี `ENCRYPTION_KEY` และ `CSRF_SECRET` ไม่เช่นนั้นจะ error ตอนเริ่มระบบ

---

## SonarQube (Code Quality)

```bash
# Start SonarQube locally
docker compose up -d

# (Recommended) generate coverage report
npm run test:coverage

# Scan project
npm run sonar:scan

# Fetch current issues to JSON
npm run sonar:fetch

# Summarize issues from JSON
npm run sonar:summary
```

> ข้อควรระวัง: ปัจจุบันมี `sonar.token` ถูกกำหนดแบบ hardcode ใน `sonar-project.properties` และ `scripts/sonar/*.js` ควรย้ายไปใช้ token ผ่าน environment variables ในอนาคตเพื่อความปลอดภัย

---

## Recent Development Focus

จากประวัติการพัฒนาล่าสุด (เรียงจากใหม่→เก่า):

1. **Gacha Machine Display Fix** - แก้ปัญหา garbled text ใน `GachaRhombus` component
2. **Role Authorization Fix** - แก้ warning ที่เกิดจาก `users.role` ไม่ sync กับ Role table
3. **Prevent Duplicate Stock** - ป้องกัน username ซ้ำใน ProductCode ทั้ง UI validation + API level ข้ามทุก product
4. **Auto-Delete System** - ระบบลบ Product อัตโนมัติหลังขาย (field: `autoDeleteAfterSale`, `scheduledDeleteAt`)
5. **Gacha System** - ระบบกาชาเต็มรูปแบบ (machines, rewards, grid game SPIN_X)
6. **Multiple Popup System** - รองรับหลาย Popup แบบ carousel
7. **Referral System** - ระบบเชิญเพื่อนพร้อม anti-abuse (IP limit)
8. **Product Code Inventory** - คลังรหัสเกมสำหรับขาย
9. **Tier System** - ระดับสมาชิกตามยอดใช้จ่าย
10. **Promo Code System** - โค้ดส่วนลด
11. **Footer/Navigation Management** - จัดการเมนูจาก Admin
12. **Animation Components** - FadeIn scroll effects

---

## Notes for AI Assistants

- **Language**: โปรเจกต์นี้เป็นภาษาไทย (Thai market)
- **Database**: MySQL with Drizzle ORM (`lib/db/schema.ts`)
- **Auth**: NextAuth v5 (JWT session) — session มี `user.id`, `user.role`
- **API Pattern**: REST API ใน `app/api/` ทุก route เป็น `route.ts`
- **Rate Limiting**: in-memory (`lib/rateLimit.ts`) — reset เมื่อ restart server; Redis เป็น optional
- **Styling**: Tailwind CSS 4 + shadcn/ui components

### API Auth Pattern

```ts
import { isAdmin, isAdminWithCsrf, isAuthenticated, isAuthenticatedWithCsrf } from "@/lib/auth";

// GET (read-only Admin)
const check = await isAdmin();
if (!check.success) return Response.json({ error: check.error }, { status: 403 });

// POST/PUT/DELETE (Admin + CSRF required)
const check = await isAdminWithCsrf(request);
if (!check.success) return Response.json({ error: check.error }, { status: 403 });

// User-facing POST (Auth + CSRF)
const check = await isAuthenticatedWithCsrf(request);
if (!check.success) return Response.json({ error: check.error }, { status: 401 });
const userId = check.userId!;
```

> ⚠️ `users.role` (varchar `"ADMIN"`) คือ source of truth — ไม่ใช่ `Role` table ใน DB

### Naming Conventions

| ประเภท | รูปแบบ | ตัวอย่าง |
|--------|--------|----------|
| API route | `app/api/[resource]/route.ts` | `app/api/products/route.ts` |
| Admin API | `app/api/admin/[feature]/route.ts` | `app/api/admin/gacha-machines/route.ts` |
| Page | `app/[page]/page.tsx` | `app/shop/page.tsx` |
| Component | PascalCase `.tsx` | `GachaRhombus.tsx` |
| DB Table | PascalCase (Drizzle) | `gachaMachines`, `gachaRewards` |
| Lib utility | camelCase `.ts` | `gachaGrid.ts`, `autoDelete.ts` |

### Known Caveats

- **Rate limit resets on restart** — `lib/rateLimit.ts` ใช้ in-memory Map; Redis ยัง optional
- **sonar.token hardcoded** — อยู่ใน `sonar-project.properties` และ `scripts/sonar/*.js` ควรย้ายไป env var
- **Role table is UI-only** — อย่าพึ่ง Role table สำหรับ auth check; ใช้ `users.role` เท่านั้น
- **Auto-delete** — ทำงานผ่าน scheduled job ใน `lib/autoDelete.ts`; ต้องมี cron trigger
- **Gacha Grid (SPIN_X)** — logic อยู่ใน `lib/gachaGrid.ts`; reward assign ด้วย intersection ของ L/R selector paths
