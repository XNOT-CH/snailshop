# snailshop.md

The knowledge index for `my-game-store` — a Thai-market store for game accounts and
in-game items. **Look here before opening source.** Most questions about where
something lives are answered by the generated index at the bottom, and answering from
it costs a fraction of reading an 800-line file.

Half of this file is generated from the code (`npm run knowledge:build`), so it cannot
quietly drift out of date. The other half is written by hand and holds what no script
can derive: the order of files a common change touches, and the traps already paid for.

- Per-directory detail lives in the `AGENTS.md` next to the code — read the nearest one
  before editing inside a directory.
- The rules that always apply are in `CLAUDE.md`.

---

## How to do the things that come up often

Each of these is the **order** of files to touch. Following it end to end is usually
faster than searching, and it is how the existing features are built.

### Add an API route

1. `app/api/<path>/route.ts` — export the method handlers.
2. Guard it: `requirePermission` / `requireAnyPermission` from `lib/auth.ts` for admin
   routes, `auth()` for user routes. Never trust a client-sent user id, role or price.
3. Validate the body with a Zod schema in `lib/validations/`.
4. Mutating routes need CSRF. If a route genuinely cannot have it, add it to
   `INTENTIONAL_NO_CSRF_ROUTES` in `tests/api/mutation-csrf-coverage.test.ts` — that
   test enumerates the routes and fails on anything unlisted.
5. If it is an admin route, add its permission to `ADMIN_API_RULES` in
   `lib/adminAccess.ts`, which is what `proxy.ts` and `auth.config.ts` gate on.
6. Client calls go through `fetchWithCsrf` from `lib/csrf-client.ts`, and the URL
   belongs in `lib/constants/apiRoutes.ts`.
7. Add an `AGENTS.md` in the new folder, following the neighbours.

### Add a permission

1. `lib/permissions.ts` — add the key, then its parent in the hierarchy map below it
   (permissions expand automatically, so a child implies its parent).
2. `app/(site)/admin/roles/page.tsx` — add the checkbox so an admin can grant it.
3. `lib/adminAccess.ts` — map the page and API paths that require it.
4. If a new audit action comes with it: `lib/auditLog.ts`, plus the label, colour and
   filter entry in `app/(site)/admin/audit-logs/page.tsx`.

> A permission with no route behind it is worse than none: the checkbox lies. The
> API-key feature shipped exactly that way and was removed in `6364a22`.

### Add an admin page

1. `app/(site)/admin/<name>/page.tsx`.
2. `components/admin/AdminSidebar.tsx` — the menu entry.
3. `lib/adminAccess.ts` — `ADMIN_PAGE_RULES`, or the page is reachable by anyone who
   can reach `/admin`. Sidebar visibility is **not** access control.
4. `app/(site)/admin/AGENTS.md` — add it to the feature map.

### Add a database table

1. `lib/db/schema.ts` — the table plus its `relations()`.
2. Write the SQL by hand under `drizzle/`, following the numbered files there.
   **Do not run `npm run db:push`** (see the traps below).
3. New columns that foreign-key an existing column must declare
   `CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci` — the existing tables use that
   collation while the MySQL 8 server default is `utf8mb4_0900_ai_ci`, and a mismatch
   fails with ERROR 3780.
4. `npm run knowledge:build` to refresh the table index below.

### Change money, stock or balances

`lib/features/orders/purchase.ts` is the transaction core; `lib/stock.ts` handles stock
strings; `lib/userBalances.ts` handles balances. All three are replay- and
double-spend-sensitive — write a test for the failure mode before the fix, and run
`npm run check:purchase-locking` when touching locking.

---

## Traps already paid for

**Never run `npm run db:push`.** `DATABASE_URL` in `.env.development.local` and in
`.env.local` both point at `localhost:3307` — the database the `web` container serves
from — and it already sits behind `lib/db/schema.ts`. A push applies the whole
accumulated diff to live data. Use targeted SQL in `drizzle/`.

**Dev and production share one database.** The `my_game_store_db_dev` container on
:3308 is running but nothing points at it. A seed or cleanup "on dev" hits the same
rows the deployed site serves.

**Mixed line endings break patches silently.** `.gitattributes` sets `eol=lf` and the
git index is all LF, but files check out as CRLF on Windows and some end up mixed. A
`sed` or partial patch against a mixed-ending file fails without an error. Match the
file's existing endings, or normalise it first.

**A red test suite is usually not your change.** Failures cluster on the first test in
a file — the one paying for `await import()` of the route under test — and they are
timeouts under CPU load, not logic. Re-run before investigating. `testTimeout` was
raised to 20s in `1364b0c` for this reason.

**Turnstile blocks headless login.** `tests/e2e/login.spec.ts` "invalid credentials"
fails against any server without `E2E_AUTH_TEST_MODE`, including the Docker build. It
is not a regression. Playwright's own server (port 3201) sets the flag, but it shares
`.next` with a running dev server — don't run both.

**Old dev orders need the legacy key.** Orders encrypted before the key rotation only
decrypt with `ENCRYPTION_PREVIOUS_KEYS=legacy-dev=…` in `.env.development.local`. When
rotating, move the outgoing key into `ENCRYPTION_PREVIOUS_KEYS` rather than dropping it.

**A Docker build can fail three ways:** a dead BuildKit frontend (drop the `# syntax`
line), MySQL `max_connections` exhausted by build workers, and CRLF files making a
patch step miss. A backgrounded `docker compose up -d --build web` has also exited 0
having built nothing — check the image age afterwards.

**Free gacha spins are unlimited on purpose.** Don't "fix" it. It only needs a warning
if a points-priced item is added.

---

## Decisions already made

- **Deploy is Docker only** — `docker compose up -d --build web`, or
  `scripts/windows/deploy-web.bat`. The Cloudflare Workers/OpenNext path was removed in
  `bade056`; the Cloudflare Tunnel in front of the container is a separate thing and
  stays.
- **Branch per piece of work**, without being asked: verify green, `merge --no-ff` into
  master, push, delete the branch.
- **Write the tests that catch silent failures** — money, permissions, guards. UI work
  and code deletion don't need new tests; check those in a browser.
- **No percentages in the admin UI.** Real numbers only — baht, people, spins,
  "X จาก Y" — because that is what the reader can act on.
- The site is in Thai. Preserve Thai user-facing text unless the task says otherwise.

---

## Stack and critical files

**Stack**

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Radix UI
- `lucide-react`
- NextAuth v5 beta
- Drizzle ORM
- MySQL
- Vitest
- Playwright
- Docker Compose (production) behind a Cloudflare Tunnel
- npm with `package-lock.json`

**The files that decide who can do what**

- `auth.ts` - NextAuth runtime and credentials authorization flow.
- `auth.config.ts` - Edge/session callbacks and protected route behavior.
- `proxy.ts` - edge route guarding before page or API code runs.
- `lib/auth.ts` - server-side auth helpers.
- `lib/adminAccess.ts` - admin page/API permission routing.
- `lib/permissions.ts` - permission definitions and helpers.
- `components/admin/AdminSidebar.tsx` - admin navigation visibility.

---

## Testing And Verification

Use the smallest command set that proves the change.

- Docs/text-only: `npm run check:encoding`.
- Shared TypeScript or business logic: `npm run test` and `npm run lint`.
- API route, auth, checkout, admin, or user-facing UI: `npm run test`, `npm run build`, and `npm run test:e2e` when practical.
- Concurrency-sensitive commerce work: add `npm run check:purchase-locking` when purchase locking, stock handoff, or checkout locking changes.
- Database schema/migration: read `drizzle/README.md`, then run the relevant Drizzle command.
- Deployment/config: `npm run check:deploy`, then `docker compose build web` to prove the image still builds.
- Security-sensitive change: add or update tests that cover the failure mode.

If a relevant verification command cannot be run, say why in the handoff.

---

## Boundaries

### Always Do

- Preserve Thai user-facing text unless the task explicitly asks to change it.
- Treat UTF-8 as the default for all text files.
- With PowerShell, use `-Encoding utf8` when reading or writing repository text files.
- With PowerShell, use `-LiteralPath` when reading or editing routes with bracketed segments such as `app/api/admin/slips/[id]/image/route.ts`.
- Keep permission checks server-side even when UI visibility is updated.
- Validate request bodies, route params, and query params before use.
- Use shared helpers from `lib/` for auth, permissions, validation, database access, security, and response formatting.
- Update or add tests when route contracts, auth behavior, or security behavior changes.

### Ask First

- Before adding dependencies or changing `package-lock.json`.
- Before changing database schema or migration strategy.
- Before editing existing committed migrations.
- Before changing CI/CD, deployment config, or production-facing settings.
- Before running destructive SQL, cleanup scripts, or storage migration scripts.
- Before making large documentation rewrites that change project policy.

### Never Do

- Never expose, print, or commit secrets from `.env*` files.
- Never edit `node_modules/`, `.next/`, `coverage/`, `playwright-report/`, or `test-results/`.
- Never edit runtime uploads/private files under `storage/uploads/` or `storage/private/` unless the task is explicitly about those files.
- Never trust client-provided user IDs, roles, prices, stock counts, balances, or permissions.
- Never weaken auth, permissions, CSRF, rate limiting, validation, audit logs, or data protection without an explicit requirement.
- Never delete failing tests or weaken assertions just to make a run pass.

---

## Domain-Specific Safety Rules

- Admin access changes must check both UI visibility (`components/admin/AdminSidebar.tsx`) and real access control (`lib/adminAccess.ts`, `lib/permissions.ts`, `lib/auth.ts`, `proxy.ts`).
- Commerce, wallet, stock, top-up, gacha, and season pass changes must consider race conditions, replay risk, and double-spend behavior.
- Route handlers live under `app/api/`; keep API response shapes stable for existing consumers.
- Read `drizzle/README.md` before changing migrations.
- Never run `npm run db:push` — see the traps section above.
- Use `npm run db:migrate` for forward migrations.
- Follow existing component patterns in `components/` and `components/ui/`.
- Use existing Radix UI/local primitives and `lucide-react` icons when they fit.
- Keep forms accessible and admin screens dense, scannable, and operational.

---

## Code Style Examples

Use real project helpers. Keep validation, authorization, and response handling explicit.

Good API route pattern:

```ts
export async function PUT(request: NextRequest) {
    const authCheck = await requirePermissionWithCsrf(request, PERMISSIONS.SETTINGS_EDIT);
    if (!authCheck.success) return contentApiError("Unauthorized", { status: 401 });

    const result = await validateBody(request, currencySettingsSchema);
    if ("error" in result) return result.error;

    const { name, symbol, description, isActive } = result.data;
    await db.update(currencySettings).set({ name, symbol, description: description || null, isActive });

    return NextResponse.json({ success: true });
}
```

Avoid route handlers that trust raw client data or skip project helpers:

```ts
export async function PUT(request: NextRequest) {
    const body = await request.json();
    await db.update(currencySettings).set(body);
    return Response.json(body);
}
```

Good test style:

```ts
describe("feature behavior", () => {
    it("rejects invalid input with the existing error message", () => {
        expect(getDateRangeError("bad", null)).toBe('Invalid "from" date. Use YYYY-MM-DD.');
    });
});
```

Typography scale (see `app/globals.css`): body text uses only `text-xs` (12px), `text-sm` (14px), `text-base` (16px), `text-xl` (20px), and `text-2xl`+ for headings. Do not add arbitrary sizes like `text-[10px]`/`text-[11px]` — anything a user must read is `text-xs` minimum. The only sanctioned sub-12px uses are fixed-size numeric counter badges, `kbd` hints, avatar initials, gacha board tiles, mobile bottom-nav labels, and dense chart axis labels. Form inputs must render at 16px on mobile (`text-base md:text-sm`, already the default in `components/ui/input.tsx`) to prevent iOS auto-zoom.

---

## Handoff Format

When finished, report:

- What changed.
- Which files were edited.
- Which verification commands were run.
- Which checks were skipped and why.
- Any remaining risks or follow-up work.

---
<!-- BEGIN GENERATED -->

<!-- Rebuilt by `npm run knowledge:build`. Do not edit this block by hand. -->

### Database tables (35)

Jump straight to the line instead of reading the whole 800-line schema.

| MySQL table | drizzle export | defined at |
|---|---|---|
| `User` | `users` | `lib/db/schema.ts:25` |
| `UserAddressProfile` | `userAddressProfiles` | `lib/db/schema.ts:91` |
| `EmailVerificationToken` | `emailVerificationTokens` | `lib/db/schema.ts:119` |
| `AuditLog` | `auditLogs` | `lib/db/schema.ts:140` |
| `Product` | `products` | `lib/db/schema.ts:165` |
| `ProductViewDaily` | `productViewsDaily` | `lib/db/schema.ts:207` |
| `Order` | `orders` | `lib/db/schema.ts:219` |
| `Topup` | `topups` | `lib/db/schema.ts:253` |
| `SeasonPassPlan` | `seasonPassPlans` | `lib/db/schema.ts:280` |
| `SeasonPassSubscription` | `seasonPassSubscriptions` | `lib/db/schema.ts:294` |
| `SeasonPassClaim` | `seasonPassClaims` | `lib/db/schema.ts:314` |
| `SeasonPassReward` | `seasonPassRewards` | `lib/db/schema.ts:330` |
| `SiteSettings` | `siteSettings` | `lib/db/schema.ts:351` |
| `HelpArticle` | `helpArticles` | `lib/db/schema.ts:387` |
| `HelpVideo` | `helpVideos` | `lib/db/schema.ts:400` |
| `NewsArticle` | `newsArticles` | `lib/db/schema.ts:416` |
| `PromoCode` | `promoCodes` | `lib/db/schema.ts:433` |
| `PromoUsage` | `promoUsages` | `lib/db/schema.ts:457` |
| `FooterWidgetSettings` | `footerWidgetSettings` | `lib/db/schema.ts:479` |
| `FooterLink` | `footerLinks` | `lib/db/schema.ts:491` |
| `NavItem` | `navItems` | `lib/db/schema.ts:508` |
| `CurrencySettings` | `currencySettings` | `lib/db/schema.ts:524` |
| `ChatConversation` | `chatConversations` | `lib/db/schema.ts:534` |
| `ChatMessage` | `chatMessages` | `lib/db/schema.ts:562` |
| `ChatQuickReply` | `chatQuickReplies` | `lib/db/schema.ts:580` |
| `AnnouncementPopup` | `announcementPopups` | `lib/db/schema.ts:594` |
| `Role` | `roles` | `lib/db/schema.ts:611` |
| `GachaCategory` | `gachaCategories` | `lib/db/schema.ts:627` |
| `GachaMachine` | `gachaMachines` | `lib/db/schema.ts:643` |
| `GachaSettings` | `gachaSettings` | `lib/db/schema.ts:675` |
| `GachaReward` | `gachaRewards` | `lib/db/schema.ts:690` |
| `GachaRollLog` | `gachaRollLogs` | `lib/db/schema.ts:715` |
| `DailyQuest` | `dailyQuests` | `lib/db/schema.ts:748` |
| `DailyQuestClaim` | `dailyQuestClaims` | `lib/db/schema.ts:767` |
| `GachaDailySpinCounter` | `gachaDailySpinCounters` | `lib/db/schema.ts:786` |

### API routes (112)

The handler for each one lives at the matching `app/<url>/route.ts`.

| Route | Methods |
|---|---|
| `/api/admin/audit-logs` | GET, DELETE |
| `/api/admin/auto-delete/run` | GET, POST |
| `/api/admin/chat/agents` | GET |
| `/api/admin/chat/cleanup-expired-images/run` | GET |
| `/api/admin/chat/conversations/[id]/context` | GET |
| `/api/admin/chat/conversations/[id]/images` | POST |
| `/api/admin/chat/conversations/[id]/messages` | POST |
| `/api/admin/chat/conversations/[id]/read` | POST |
| `/api/admin/chat/conversations/[id]` | GET, PATCH, DELETE |
| `/api/admin/chat/conversations` | GET |
| `/api/admin/chat/templates/[id]` | PATCH, DELETE |
| `/api/admin/chat/templates` | GET, POST |
| `/api/admin/chat/unread-count` | GET |
| `/api/admin/currency-settings` | GET, PUT |
| `/api/admin/dashboard/best-sellers` | GET |
| `/api/admin/dashboard/category-distribution` | GET |
| `/api/admin/dashboard/gacha-machines` | GET |
| `/api/admin/dashboard/gacha-summary` | GET |
| `/api/admin/dashboard/kpi-summary` | GET |
| `/api/admin/dashboard/member-insights` | GET |
| `/api/admin/dashboard/revenue` | GET |
| `/api/admin/dashboard/stale-stock` | GET |
| `/api/admin/export` | GET |
| `/api/admin/footer-links/[id]` | PUT, DELETE |
| `/api/admin/footer-links` | GET, POST |
| `/api/admin/footer-links/settings` | GET, PUT |
| `/api/admin/gacha-machines/[id]/duplicate` | POST |
| `/api/admin/gacha-machines/[id]` | GET, PATCH, DELETE |
| `/api/admin/gacha-machines/reorder` | POST |
| `/api/admin/gacha-machines` | GET, POST |
| `/api/admin/gacha-machines/upload-image` | POST |
| `/api/admin/gacha-products` | GET |
| `/api/admin/gacha-rewards/[id]` | PUT, DELETE |
| `/api/admin/gacha-rewards` | GET, POST |
| `/api/admin/gacha-rewards/upload-image` | POST |
| `/api/admin/help-videos/[id]` | PUT, DELETE |
| `/api/admin/help-videos` | GET, POST |
| `/api/admin/help/[id]` | PUT, DELETE |
| `/api/admin/help` | GET, POST |
| `/api/admin/nav-items/[id]` | PUT, DELETE |
| `/api/admin/nav-items` | GET, POST |
| `/api/admin/news/[id]` | GET, PUT, DELETE |
| `/api/admin/news` | GET, POST |
| `/api/admin/popups/[id]` | GET, PUT, DELETE |
| `/api/admin/popups` | GET, POST |
| `/api/admin/products/[id]/duplicate` | POST |
| `/api/admin/products/[id]/featured` | PATCH |
| `/api/admin/products/categories` | GET |
| `/api/admin/products/stock-check` | POST |
| `/api/admin/promo-codes/[id]` | GET, PUT, DELETE |
| `/api/admin/promo-codes` | GET, POST |
| `/api/admin/quests/[id]` | PATCH, DELETE |
| `/api/admin/quests` | GET, POST |
| `/api/admin/roles/[id]` | GET, PUT, DELETE |
| `/api/admin/roles` | GET, POST |
| `/api/admin/season-pass/lifecycle` | GET, POST |
| `/api/admin/season-pass/plan` | GET, PUT |
| `/api/admin/season-pass/rewards` | GET, PUT |
| `/api/admin/season-pass/subscriptions/[id]` | POST |
| `/api/admin/season-pass/upload-image` | POST |
| `/api/admin/settings` | GET, PUT |
| `/api/admin/slips/[id]/image` | GET |
| `/api/admin/slips` | GET, PATCH |
| `/api/admin/users/[id]` | PATCH, POST |
| `/api/auth/[...nextauth]` | — |
| `/api/auth/forgot-password` | POST |
| `/api/auth/reset-password` | GET, POST |
| `/api/cart/checkout` | POST |
| `/api/cart/refresh` | POST |
| `/api/chat/conversation` | GET |
| `/api/chat/images` | POST |
| `/api/chat/media/[messageId]` | GET |
| `/api/chat/messages` | POST |
| `/api/chat/read` | POST |
| `/api/csrf` | GET |
| `/api/currency-settings` | GET |
| `/api/dashboard/members-summary` | GET |
| `/api/dashboard/topup-summary` | GET |
| `/api/dashboard/topup-trend` | GET |
| `/api/featured-products` | GET |
| `/api/gacha/drop-rates` | GET |
| `/api/gacha/grid/rewards` | GET |
| `/api/gacha/grid/roll` | POST |
| `/api/gacha/recent` | GET |
| `/api/gacha/roll` | POST |
| `/api/health` | GET |
| `/api/logout` | POST |
| `/api/orders/[id]` | GET, DELETE |
| `/api/popups` | GET |
| `/api/products/[id]/availability` | GET |
| `/api/products/[id]/permanent` | DELETE |
| `/api/products/[id]/restore` | POST |
| `/api/products/[id]` | GET, PUT, DELETE |
| `/api/products/[id]/stock` | GET, PUT |
| `/api/products/list` | GET |
| `/api/products` | POST |
| `/api/profile` | GET |
| `/api/profile/send-verification-email` | POST |
| `/api/profile/upload-image` | POST, DELETE |
| `/api/promo-codes/redeem` | POST |
| `/api/promo-codes/validate` | POST |
| `/api/purchase` | POST |
| `/api/quests/claim` | POST |
| `/api/register` | POST |
| `/api/sale-products` | GET |
| `/api/season-pass/claim` | POST |
| `/api/season-pass/purchase` | POST |
| `/api/session` | GET, POST, DELETE |
| `/api/system/maintenance` | GET |
| `/api/topup` | POST |
| `/api/upload` | POST |
| `/api/user/balance` | GET |

### Files over 600 lines (28)

Read a range, not the file. Landmarks are `name:line`.

| File | Lines | Landmarks |
|---|---|---|
| `app/globals.css` | 3925 | @theme inline:11, Unified Luxury Blue Theme:99, :root:101, DARK MODE THEME - Premium Gaming Style:181, SweetAlert2 Global Overrides:187, @layer base:358, DARK MODE ENHANCEMENTS:404, Glass effect cards in dark mode:412 |
| `app/(site)/profile/settings/page.tsx` | 1920 | parseApiResponse:88, sanitizePhone:112, sanitizeTaxId:116, sanitizeThaiName:120, sanitizeEnglishName:124, cloneAddress:173, hasAddressData:177, getAddressSummary:181 |
| `app/(site)/admin/settings/page.tsx` | 1356 | isValidHttpUrl:59, isValidImageRef:69, AdminSettingsPage:101, BannerCard:1102 |
| `app/(site)/admin/promo-codes/page.tsx` | 1199 | parsePromoDate:118, toBangkokDateInputValue:127, isExpired:140, isNotStarted:145, getPromoStatus:150, StatusBadge:185, getCodeTypeBadgeClass:195, getCodeTypeLabel:201 |
| `app/(site)/admin/users/AdminUsersClient.tsx` | 1188 | formatRoleLabel:67, escapeHtml:80, isInternalRoleCode:89, getSystemRoleLabel:93, sanitizeDecimalInput:105, sanitizeIntegerInput:119, isValidDecimalInput:123, isValidIntegerInput:127 |
| `app/(site)/dashboard/topup/page.tsx` | 1127 | BANK_INFO:41, getVerifyMethodLabel:96, getVerifyTargetLabel:112, TopupPage:116 |
| `components/admin/ProductTable.tsx` | 1104 | formatAutoDelete:96, hasDiscountPrice:116, getActivePrice:124, getDisplayStockCount:128, getStockTone:132, getProductCardData:148, getPriceText:161, getOriginalPriceText:167 |
| `app/(site)/admin/gacha-machines/[id]/edit/page.tsx` | 1102 | validImageUrl:63, defaultAddForm:81, buildRewardPayload:101, sortRewards:123, getSimulationRewardName:152, isRewardEligibleForSimulation:158, validateReward:162, ProductPickerDropdown:181 |
| `app/(site)/admin/audit-logs/page.tsx` | 1046 | getActionBadgeClass:287, getChangeValue:295, getResourceDetailsHtml:315, getVisibleCheckboxState:338, getDeleteConfirmText:350, AdminAuditLogsPage:367 |
| `app/(site)/admin/footer-links/page.tsx` | 997 | getDomainLabel:79, SortableRow:98, SortableCard:205, DragPreview:300, FooterColumnBoard:347, FooterLinksAdminPage:457 |
| `lib/seasonPass.ts` | 986 | normalizeSeasonPassRewardType:28, DEFAULT_PLAN:44, addDays:91, parseMySqlDateTime:97, dateKeyToUtcMs:101, diffDaysByDateKey:106, getEffectiveSeasonPassStartAt:110, normalizeRewardDefinition:125 |
| `lib/rateLimit.ts` | 979 | config:25, checkLoginRateLimit:104, checkLoginIpRateLimit:113, checkLoginRateLimitWithConfig:122, recordFailedLogin:179, recordFailedLoginIp:183, recordFailedLoginWithConfig:187, clearLoginAttempts:214 |
| `components/cart/CartSheet.tsx` | 953 | normalizeOptionalPrice:64, buildSyncedCartItem:68, hasCartItemChanged:85, hasCheckoutRelevantChange:96, CartSheetContent:103, CartSheet:926 |
| `app/(site)/admin/news/page.tsx` | 943 | getExcerpt:75, AdminNewsPage:81 |
| `components/DailyTopupSummary.tsx` | 920 | StatusBadge:78, DetailModal:106, AmountTooltip:207, TxnTooltip:227, HourlyTooltip:247, SortIcon:269, DailyTopupSummary:285 |
| `app/(site)/admin/gacha-machines/page.tsx` | 895 | validImageUrl:57, renderCostText:61, getFormFieldString:75, getCostAmountFieldCopy:85, GachaMachinesAdminPage:129, SortableRow:521, MachineTable:649 |
| `lib/chat.ts` | 827 | serializeMessage:101, serializeConversationTimestamps:130, getChatUser:144, getChatAssignee:162, getConversationMessagesWindow:185, hydrateConversation:242, getOrCreateUserConversation:273, getUserConversation:309 |
| `lib/db/schema.ts` | 798 | now:19, updatedAt:20 |
| `app/(site)/admin/season-pass/edit/page.tsx` | 748 | getRewardTypeOptions:55, getRewardTypeDisplayName:63, getDefaultRewardImage:86, normalizeRewardType:90, fallbackRewards:106, AdminSeasonPassEditPage:117 |
| `app/(site)/admin/help/page.tsx` | 739 | emptyArticleForm:67, emptyVideoForm:74, AdminHelpPage:80 |
| `app/(site)/admin/popups/page.tsx` | 736 | getDismissLabel:69, AdminPopupsPage:76 |
| `components/admin/chat/useAdminChatInbox.ts` | 674 | sortConversations:26, mergeConversationPage:43, mergeMessages:53, useAdminChatInbox:69 |
| `components/GachaRhombus.tsx` | 674 | getParticles:84, WinBurst:106, TileImage:128, getRouletteDelay:145, getRollingButtonLabel:157, getSelectorIndex:169, getPathIndices:173, getIntersectionIndex:179 |
| `lib/features/orders/purchase.ts` | 659 | getActivePrice:101, processStock:110, getAutoDeleteTimestamp:130, buildCartThbPromoItems:138, buildDiscountedThbPriceMap:162, sumAppliedDiscount:228, validateAndSummarizeCartProducts:238, getRawTransactionConnection:293 |
| `app/(site)/admin/products/new/page.tsx` | 641 | AddProductPage:44 |
| `app/(site)/admin/roles/page.tsx` | 630 | normalizeRolePermissions:49, PERMISSION_GROUPS:53, AdminRolesPage:116 |
| `components/MembersSummary.tsx` | 630 | baht:100, daysAgoLabel:116, MemberCell:122, MembersSummary:140 |
| `app/api/gacha/roll/route.ts` | 620 | purgeExpiredPendingSpinState:62, shouldFallbackProductReward:76, buildPendingSpinKey:85, fetchRewards:89, fetchTieredProducts:118, handleSpin1:127, persistPendingSpin:339, readPendingSpin:359 |

### npm scripts (29)

| Command | Runs |
|---|---|
| `npm run dev` | `node scripts/dev/run-next-dev.mjs` |
| `npm run build` | `next build --webpack` |
| `npm run start` | `next start` |
| `npm run test:e2e` | `playwright test` |
| `npm run test:e2e:headed` | `playwright test --headed` |
| `npm run test:e2e:ui` | `playwright test --ui` |
| `npm run check:deploy` | `node scripts/deploy/validate-deploy.mjs` |
| `npm run check:db-health` | `node scripts/db/validate-db-health.mjs` |
| `npm run check:purchase-locking` | `node scripts/ops/verify-purchase-locking.mjs` |
| `npm run check:encoding` | `node scripts/quality/check-encoding.mjs` |
| `npm run knowledge:build` | `node scripts/quality/build-snailshop-index.mjs` |
| `npm run knowledge:check` | `node scripts/quality/build-snailshop-index.mjs --check` |
| `npm run lint` | `eslint` |
| `npm run test` | `vitest run` |
| `npm run test:watch` | `vitest` |
| `npm run test:coverage` | `vitest run --coverage` |
| `npm run db:push` | `npx drizzle-kit push` |
| `npm run db:migrate` | `npx drizzle-kit migrate` |
| `npm run db:studio` | `npx drizzle-kit studio` |
| `npm run products:export:dev` | `node scripts/products/export-products-dev.mjs` |
| `npm run products:import:prod` | `node scripts/products/import-products-prod.mjs` |
| `npm run products:backfill-stock-count` | `npx tsx scripts/products/backfill-stock-count.ts` |
| `npm run db:migrate-sensitive` | `node scripts/db/migrate-sensitive-data.mjs` |
| `npm run storage:migrate-slips` | `node scripts/storage/migrate-slip-files.mjs` |
| `npm run storage:cleanup-legacy-slips` | `node scripts/storage/cleanup-legacy-slip-files.mjs` |
| `npm run ops:reconcile-commerce` | `node scripts/ops/reconcile-commerce.mjs` |
| `npm run sonar:scan` | `node scripts/sonar/run-sonar.js` |
| `npm run sonar:fetch` | `node scripts/sonar/fetch-sonar.js` |
| `npm run sonar:summary` | `node scripts/sonar/summarize-sonar.js` |

<!-- END GENERATED -->
