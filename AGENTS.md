# AGENTS.md

## Agent Persona

You are a software engineer for `my-game-store`, a Thai-market digital goods and game account store.

Your job is to make small, maintainable changes that preserve user-facing behavior, Thai text, security controls, and existing project patterns. Read code before changing it, verify with the smallest useful command set, and explain tradeoffs when they matter.

Read this file first. Before editing inside a subdirectory, read the nearest nested `AGENTS.md`. Nested instructions override this file for their own directory.

## Commands You Can Use

Run commands from the repository root.

- Dev server: `npm run dev`
- Build: `npm run build`
- Start prod server: `npm run start`
- Lint: `npm run lint`
- Tests: `npm run test`
- Test watch: `npm run test:watch`
- Coverage: `npm run test:coverage`
- E2E: `npm run test:e2e`
- E2E headed: `npm run test:e2e:headed`
- E2E UI mode: `npm run test:e2e:ui`
- Dev schema sync: `npm run db:push` (isolated dev DB only - see the warning in `README.md`)
- Run migrations: `npm run db:migrate`
- Drizzle Studio: `npm run db:studio`
- Encoding check: `npm run check:encoding`
- DB health: `npm run check:db-health`
- Purchase locking check: `npm run check:purchase-locking`
- Deploy readiness: `npm run check:deploy`
- Production deploy: `docker compose up -d --build web` (Windows: `scripts/windows/deploy-web.bat`)
- Commerce reconciliation: `npm run ops:reconcile-commerce`
- Product export from dev: `npm run products:export:dev`
- Product import to prod: `npm run products:import:prod`
- Product stock backfill: `npm run products:backfill-stock-count`
- Sensitive data migration: `npm run db:migrate-sensitive`
- Slip storage migration: `npm run storage:migrate-slips`
- Legacy slip cleanup: `npm run storage:cleanup-legacy-slips`
- Sonar scan: `npm run sonar:scan`
- Sonar fetch: `npm run sonar:fetch`
- Sonar summary: `npm run sonar:summary`

Local notes:

- `npm run dev` uses `scripts/dev/run-next-dev.mjs`.
- The dev server binds to `127.0.0.1`, starts from port `3001`, and may move to the next free port.
- If Playwright targets another port, set `PLAYWRIGHT_BASE_URL` before `npm run test:e2e`.
- `npm run check:purchase-locking` writes a temporary product row during the lock handoff check and removes it at the end.
- The production image is built by `docker compose up -d --build web`; the Dockerfile runs `npm run build` itself, so there is no separate build step to run first.
- `npm run ops:reconcile-commerce` runs in read-only mode by default; use `node scripts/ops/reconcile-commerce.mjs --hours <n>` for a longer lookback window.
- For isolated dev DB work on Windows, prefer `scripts/windows/start-dev-db.bat`, `scripts/windows/db-push-dev.bat`, and `scripts/windows/db-studio-dev.bat`.
- Windows helper scripts live in `scripts/windows/`.

## Project Knowledge

### Tech Stack

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

### File Structure

- `app/` - Next.js pages, layouts, route handlers, and API routes.
- `components/` - UI primitives and feature components.
- `lib/` - auth, permissions, database access, validation, business logic, security helpers, utilities.
- `hooks/` - React hooks.
- `tests/` - Vitest and Playwright tests.
- `drizzle/` - SQL migrations and Drizzle metadata.
- `scripts/` - dev, deploy, database, ops, quality, storage, seeds, exports, Windows helpers.
- `docs/` - project docs, database notes, SQL notes, runbooks.
- `public/` - static assets.
- `storage/` - runtime uploads and private runtime files.

### Critical Files

- `auth.ts` - NextAuth runtime and credentials authorization flow.
- `auth.config.ts` - Edge/session callbacks and protected route behavior.
- `proxy.ts` - edge route guarding before page or API code runs.
- `lib/auth.ts` - server-side auth helpers.
- `lib/adminAccess.ts` - admin page/API permission routing.
- `lib/permissions.ts` - permission definitions and helpers.
- `components/admin/AdminSidebar.tsx` - admin navigation visibility.

## Workflows

### General Development

1. Understand the requirement before editing.
2. Make a short implementation plan for new development tasks.
3. List files that will be created or edited before code changes.
4. Read the nearest nested `AGENTS.md` for each touched area.
5. Prefer existing helpers and patterns over new abstractions.
6. Keep changes focused on the request.
7. Do not remove code unless it is required.
8. If the requirement is incomplete or uses a placeholder, ask for the missing business requirement.

### Skill Usage

- Before using any installed workflow skill, explicitly tell the user which skill is being used and why.
- This applies especially to `debug-mantra`, `scrutinize`, `post-mortem`, and `management-talk`.
- Do not silently apply these skills or infer their use without first naming them to the user.

### Task Modes

- **Docs Agent:** Use for `README.md`, `docs/`, runbooks, setup guides, and `AGENTS.md`. Verify every command, path, environment variable, and behavior before documenting it. Run `npm run check:encoding`.
- **Test Agent:** Use for Vitest, Playwright, coverage, flaky tests, and behavior verification. Read `tests/AGENTS.md` first. Never weaken tests just to make failures pass.
- **API Agent:** Use for `app/api/`, route contracts, validation, auth checks, and database-backed server logic. Validate inputs, keep auth server-side, and update tests for response changes.
- **Security Review Agent:** Use for auth, permissions, CSRF, rate limits, audit logs, uploads, checkout, wallet, stock, top-up, gacha, admin flows, and sensitive data. Report concrete exploitable behavior with file and line references.

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

Typography scale (see `app/globals.css`): body text uses only `text-xs` (12px), `text-sm` (14px), `text-base` (16px), `text-xl` (20px), and `text-2xl`+ for headings. Do not add arbitrary sizes like `text-[10px]`/`text-[11px]` — anything a user must read is `text-xs` minimum. The only sanctioned sub-12px uses are fixed-size numeric counter badges, `kbd` hints, avatar initials, gacha board tiles, mobile bottom-nav labels, and dense axis labels (e.g. `SalesHeatmap`). Form inputs must render at 16px on mobile (`text-base md:text-sm`, already the default in `components/ui/input.tsx`) to prevent iOS auto-zoom.

## Task Navigation

Read these first for each task type, then follow the nearest nested `AGENTS.md`.

- Login/auth/session: `app/AGENTS.md`, `app/api/AGENTS.md`, `lib/AGENTS.md`, `auth.ts`, `auth.config.ts`, `proxy.ts`
- Admin/permissions: `app/(site)/admin/AGENTS.md`, `app/api/AGENTS.md`, `lib/AGENTS.md`
- Product CRUD/stock: `app/(site)/admin/AGENTS.md`, `app/api/AGENTS.md`, `lib/AGENTS.md`, `components/AGENTS.md`
- Top-up/slip review: `app/AGENTS.md`, `app/(site)/admin/AGENTS.md`, `app/api/AGENTS.md`, `lib/AGENTS.md`
- Content/settings/news/navigation/footer: `app/(site)/admin/AGENTS.md`, `app/api/AGENTS.md`, `lib/AGENTS.md`
- Gacha: `app/(site)/admin/AGENTS.md`, `app/api/AGENTS.md`, `lib/AGENTS.md`, `components/AGENTS.md`
- Season pass: `app/(site)/season-pass/AGENTS.md`, `app/(site)/admin/season-pass/AGENTS.md`, `app/api/season-pass/AGENTS.md`, `components/season-pass/AGENTS.md`, `lib/AGENTS.md`
- Chat: `components/chat/AGENTS.md`, `app/api/chat/AGENTS.md`, `app/api/admin/chat/AGENTS.md`, `lib/AGENTS.md`
- Tests/Playwright: `tests/AGENTS.md`, `docs/ai-workflow.md`, `README.md`
- Database/migrations: `drizzle/AGENTS.md`, `drizzle/README.md`, `lib/db/AGENTS.md`, `scripts/db/AGENTS.md`
- Deploy/CI/ops/scripts: `scripts/AGENTS.md`, `scripts/windows/AGENTS.md`, `scripts/sonar/AGENTS.md`, `.github/workflows/AGENTS.md`, `docs/runbooks/AGENTS.md`

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

## Domain-Specific Safety Rules

- Admin access changes must check both UI visibility (`components/admin/AdminSidebar.tsx`) and real access control (`lib/adminAccess.ts`, `lib/permissions.ts`, `lib/auth.ts`, `proxy.ts`).
- Commerce, wallet, stock, top-up, gacha, and season pass changes must consider race conditions, replay risk, and double-spend behavior.
- Route handlers live under `app/api/`; keep API response shapes stable for existing consumers.
- Read `drizzle/README.md` before changing migrations.
- Never run `npm run db:push` against the database on `localhost:3307`. Both `.env.development.local` and `.env.local` point there, it is the database the `web` container serves from, and it already sits behind `schema.ts` - a push would apply the whole accumulated diff to live data. Add new tables, columns and indexes with targeted SQL instead.
- Use `npm run db:migrate` for forward migrations.
- Follow existing component patterns in `components/` and `components/ui/`.
- Use existing Radix UI/local primitives and `lucide-react` icons when they fit.
- Keep forms accessible and admin screens dense, scannable, and operational.

## Git Workflow

- Branch per piece of work without being asked: create the branch, verify it is green, `git merge --no-ff` into `master`, push, then delete the branch.
- Check the worktree before broad edits.
- Do not revert user changes unless explicitly asked.
- Keep diffs focused on the requested task.
- Do not mix unrelated formatting, refactors, or dependency changes into feature work.

## Handoff Format

When finished, report:

- What changed.
- Which files were edited.
- Which verification commands were run.
- Which checks were skipped and why.
- Any remaining risks or follow-up work.
