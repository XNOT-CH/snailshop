# Security Best Practices Report

Date: 2026-06-03
Scope: `my-game-store` Next.js 16 / React 19 / TypeScript application, with emphasis on auth, admin APIs, CSRF, content rendering, uploads, commerce, top-up, gacha, deployment headers, and client-side security sinks.

## Executive Summary

The codebase already has several strong security defaults: server-side permission helpers, CSRF-aware auth wrappers, PIN checks for high-risk user actions, private slip storage, image signature checks, unique IDs, encrypted sensitive fields, and tests that enforce admin mutation CSRF coverage.

The highest-priority gaps are frontend escape-hatch issues and secure-default drift around URL validation. Several SweetAlert modals build raw HTML strings with stored values, and nav/footer link schemas allow arbitrary URL schemes that later reach public anchors. I also found a legacy email-verification endpoint missing CSRF, rate-limit controls that rely on spoofable forwarded headers and memory fallback in multi-instance deployments, and a security-header/upload posture that should be tightened for an app handling accounts, wallet balance, slips, and admin workflows.

## High Severity

### SBP-001 - Stored/admin XSS risk in SweetAlert HTML templates

Rule ID: REACT-XSS-001 / REACT-DOM-001

Severity: High

Location:
- `lib/swal.ts:100-108`
- `lib/swal.ts:157-170`
- `app/(site)/admin/footer-links/page.tsx:521-545`
- `app/(site)/admin/news/page.tsx:287-340`
- `app/(site)/admin/popups/page.tsx:223-274`

Evidence:
- `showDeleteConfirm` interpolates `itemName` into `html` at `lib/swal.ts:107`.
- Purchase confirmation interpolates `params.productName` into a raw HTML string at `lib/swal.ts:169`.
- Footer, news, and popup admin dialogs interpolate stored values such as `link.label`, `link.href`, `article.description`, `article.imageUrl`, `article.link`, `popup.title`, `popup.imageUrl`, and `popup.linkUrl` into SweetAlert `html`.

Impact:
A user with content/settings edit access, or an attacker who compromises a content row, can store a payload that is parsed as HTML when an admin opens an edit/delete/preview modal. Because the injected script runs in the application origin, it can call same-origin APIs as the victim. HttpOnly cookies reduce token theft, but they do not stop same-origin API calls from injected JavaScript.

Fix:
- Prefer React/Radix dialogs or SweetAlert `input` options instead of string-built `html`.
- If SweetAlert HTML must remain, centralize `escapeHtml` and separate text-node escaping from attribute escaping.
- Build modal content in `didOpen` with DOM APIs: assign `.value`, `.textContent`, and validated `href`/`src` properties instead of interpolating strings.
- Add regression tests using payloads that include quotes, tags, event-handler attributes, and `javascript:` URLs.

Mitigation:
Add a stricter CSP as defense in depth, but do not rely on CSP as the primary fix.

False positive notes:
Some inputs are admin-only, but admin-only XSS is still high impact because the admin surface controls permissions, content, slips, products, and settings.

### SBP-002 - Nav and footer links accept unsafe URL schemes

Rule ID: REACT-URL-001 / REACT-REDIRECT-001

Severity: High

Location:
- `lib/validations/content.ts:10-17`
- `lib/validations/content.ts:83-89`
- `components/Navbar.tsx:165-169`
- `components/NavigationDrawer.tsx:258-267`
- `components/Footer.tsx:93-104`

Evidence:
- `navItemSchema.href` and `footerLinkSchema.href` are plain strings with length checks only.
- Public navigation renders `link.href` directly into `Link`.
- Public footer renders `link.href` directly into either `a href` or `Link href`.

Impact:
If a settings editor saves `javascript:...`, `data:...`, or another active scheme, the value can become a persistent, user-facing script/navigation sink. This can produce click-triggered XSS or phishing flows across public pages.

Fix:
- Reuse a shared URL validator for all content links.
- Allow only same-origin relative paths that start with exactly one `/`, or absolute `http:`/`https:` URLs.
- Reject protocol-relative URLs like `//example.com` unless explicitly required.
- Normalize and validate again server-side in every route handler that persists link-like fields.
- Add tests for `javascript:alert(1)`, `data:text/html,...`, `//evil.example`, whitespace-prefixed URLs, and valid local/HTTPS URLs.

Mitigation:
When rendering external links, keep `rel="noopener noreferrer"` and consider clearly marking external destinations. This does not replace server-side URL validation.

False positive notes:
News and popup validators are stricter than nav/footer today, but they still treat any value starting with `/` as acceptable. Tighten that shared helper to reject `//...`.

## Medium Severity

### SBP-003 - Legacy email-verification endpoint performs a side effect without CSRF protection

Rule ID: NEXT-CSRF-001 / REACT-CSRF-001

Severity: Medium

Location:
- `app/api/auth/send-verification-email/route.ts:12-25`
- `app/api/auth/send-verification-email/route.ts:65-79`
- `app/api/profile/send-verification-email/route.ts:1-25` as the safer comparison path
- `tests/api/mutation-csrf-coverage.test.ts:18-29`

Evidence:
The `/api/auth/send-verification-email` POST route authenticates with `auth()` but does not call `isAuthenticatedWithCsrf` or another CSRF guard before creating an email verification token and sending mail. The newer `/api/profile/send-verification-email` route uses `isAuthenticatedWithCsrf`, but the legacy auth route is explicitly allowlisted in the mutation CSRF coverage test.

Impact:
An attacker may be able to trigger unwanted verification-email sends/token churn for a logged-in user, depending on cookie SameSite behavior and deployment details. The rate limit reduces volume, but CSRF protection should be consistent for cookie-authenticated side effects.

Fix:
- Either remove/deprecate `/api/auth/send-verification-email` fully with a 410 response, or change it to use `isAuthenticatedWithCsrf(request)`.
- Remove it from `INTENTIONAL_NO_CSRF_ROUTES`.
- Add a regression test mirroring `tests/api/profile-send-verification-email.test.ts`.

Mitigation:
Keep rate limiting, but treat it as abuse reduction, not CSRF protection.

False positive notes:
The current UI appears to call `/api/profile/send-verification-email`, so this may be a legacy compatibility route. That makes deprecation a low-risk fix.

### SBP-004 - Rate limits rely on spoofable forwarded headers and partial in-memory fallback

Rule ID: NEXT-DOS-001

Severity: Medium

Location:
- `lib/rateLimit.ts:1-5`
- `lib/rateLimit.ts:428-455`
- `lib/rateLimit.ts:830-839`
- `lib/rateLimit.ts:845-858`
- `lib/redis.ts:13-18`
- `scripts/deploy/validate-deploy.mjs:121-129`

Evidence:
- The rate-limit helper documents in-memory storage as single-server only.
- Register, purchase, top-up, and gacha throttles use local `checkWindowRateLimit` style counters.
- `getClientIp` trusts `x-forwarded-for` and `x-real-ip` directly.
- Missing Redis credentials only warn and return `null`.
- Deploy validation warns about missing shared login rate limiting unless `REQUIRE_SHARED_LOGIN_RATE_LIMIT=1`; it does not require shared limits for all high-risk routes.

Impact:
In a multi-instance, serverless, or Cloudflare/OpenNext deployment, memory counters are not a durable or shared abuse boundary. If direct access or header forwarding is misconfigured, attackers can also spoof `x-forwarded-for` to rotate rate-limit identifiers.

Fix:
- Add distributed Redis-backed helpers for register, purchase, top-up, gacha, chat, and promo throttles, not only login/reset/email verification.
- In production, fail deploy readiness unless shared rate limiting is configured for high-risk flows.
- Resolve client IP from the trusted deployment boundary. For Cloudflare, prefer a trusted `cf-connecting-ip` path and reject or ignore user-supplied forwarded headers unless the request came through the trusted proxy.
- Deny direct origin access where possible so attackers cannot set forwarding headers themselves.

Mitigation:
Keep Turnstile and PIN checks, but do not treat them as substitutes for durable throttling.

False positive notes:
If Cloudflare overwrites forwarded headers and all traffic is forced through the edge, spoofing risk is lower. The app code and deploy checks should still encode that assumption.

### SBP-005 - CSP and active-content upload posture are weaker than the app risk profile

Rule ID: NEXT-HEADERS-001 / REACT-CSP-001 / NEXT-FILES-001

Severity: Medium

Location:
- `next.config.ts:53-55`
- `next.config.ts:109-112`
- `app/uploads/[...segments]/route.ts:73-82`
- `lib/cloudflareStorage.ts:10-17`

Evidence:
- Next image config enables `dangerouslyAllowSVG`.
- The global CSP only sets `frame-ancestors 'self'`.
- The upload proxy serves R2 object `contentType` directly.
- `lib/cloudflareStorage.ts` maps `.svg` to `image/svg+xml`.

Impact:
SVG and other active content are historically high-risk when served inline. The current upload pipeline rejects SVG for new image uploads, which is good, but legacy/R2 objects and future callers can still reach inline SVG serving behavior. A frame-only CSP does not provide meaningful defense in depth against script injection elsewhere in the app.

Fix:
- Add an application CSP with at least `default-src`, `script-src`, `style-src`, `img-src`, `connect-src`, `font-src`, `object-src 'none'`, `base-uri 'self'`, and `form-action 'self'`.
- If `dangerouslyAllowSVG` remains enabled, add Next image `contentSecurityPolicy` and keep `contentDispositionType: "attachment"`.
- Decide whether `/uploads` should ever serve SVG. If not, reject SVG in `getContentTypeFromFilename`/upload proxy or force `Content-Disposition: attachment` for SVG.
- Add `X-Content-Type-Options: nosniff` on upload proxy responses too.

Mitigation:
Audit R2 and legacy upload objects for unexpected `.svg` files before tightening behavior, to avoid breaking legitimate icons.

False positive notes:
`contentDispositionType: "attachment"` is already a good control for Next's image optimizer. The concern is the broader app/upload proxy and incomplete CSP.

### SBP-006 - Credentialed CORS is applied globally to all API routes

Rule ID: NEXT-CORS-001

Severity: Medium

Location:
- `next.config.ts:123-144`

Evidence:
Every `/api/:path*` response gets `Access-Control-Allow-Credentials: true`, an allowed origin, broad mutation methods, and headers including `Authorization` and `X-API-Key`.

Impact:
The origin is not reflected from the request, which is good, but a global credentialed CORS policy increases blast radius if `ALLOWED_ORIGIN` is misconfigured or if only a small subset of APIs actually need cross-origin browser access. It also makes future API additions inherit credentialed cross-origin behavior by default.

Fix:
- Remove global credentialed CORS unless a documented frontend origin truly needs it.
- Prefer same-origin APIs for this Next.js app.
- If CORS is required, apply it only to the specific routes that need it, with a strict origin allowlist, exact methods, and minimal headers.
- Add deploy validation to reject wildcard or non-HTTPS production CORS origins.

Mitigation:
Keep CSRF checks on cookie-authenticated state-changing routes. CORS is not a CSRF defense.

False positive notes:
The current `accessControlOrigin` is a single configured value, not `*`. The recommendation is about least privilege and future-proofing.

## Low Severity / Hardening

### SBP-007 - Public Cube.js token should be documented as non-secret or moved server-side

Rule ID: NEXT-SECRETS-001 / REACT-CONFIG-001

Severity: Low

Location:
- `.env.example:62-64`
- `lib/cubejs.ts:3-9`

Evidence:
The app reads `NEXT_PUBLIC_CUBEJS_API_TOKEN` in a shared module and passes it to the browser-side Cube.js client.

Impact:
Any `NEXT_PUBLIC_*` value is browser-visible. If this token can query sensitive analytics, a user can extract and reuse it outside the intended UI.

Fix:
- If the token is public/read-only by design, rename/document it as such and constrain its Cube.js security context.
- If it grants private access, move analytics queries behind a server route that enforces auth/permission checks and keeps the token server-side.

Mitigation:
Review Cube.js permissions and dashboards for exposure of revenue, user, order, or slip data.

False positive notes:
Some analytics clients intentionally use public scoped tokens. The secure default is to make that scope explicit.

### SBP-008 - Some error paths return raw exception messages to clients

Rule ID: NEXT-ERROR-001 / NEXT-LOG-001

Severity: Low

Location:
- `app/api/register/route.ts:125-133`
- `app/api/topup/route.ts:282-284`
- `app/api/purchase/route.ts:177-184`
- `app/api/gacha/roll/route.ts:600-602`

Evidence:
Several catch blocks return `error.message` directly in JSON responses.

Impact:
Internal database, third-party API, validation, or implementation details can leak to unauthenticated or user-facing clients when unexpected errors occur.

Fix:
- Return generic user-facing messages for unexpected errors.
- Preserve known business errors through explicit allowlists, as gacha already partially does.
- Log details server-side with redaction.

Mitigation:
Keep existing Thai business messages for expected validation failures so user experience does not regress.

False positive notes:
Some returned messages are intentional business errors. The concern is unrecognized exceptions in broad catch blocks.

### SBP-009 - Host-derived production redirects should be tied to a canonical origin

Rule ID: NEXT-HOST-001 / NEXT-REDIRECT-001

Severity: Low

Location:
- `middleware.ts:20-31`

Evidence:
The HTTPS redirect builds `https://${host}${pathname}${request.nextUrl.search}` from the incoming `host` header.

Impact:
If the origin is reachable directly or a proxy passes attacker-controlled host headers, redirects can point to attacker-controlled domains. This is usually constrained by the edge layer, but the app code does not encode the allowlist.

Fix:
- Use a configured canonical origin for production redirects, or validate `host` against an allowlist.
- Add deploy checks for canonical `NEXT_PUBLIC_SITE_URL`, `AUTH_URL`, and allowed hostnames.

Mitigation:
Ensure Cloudflare or the hosting layer rejects unknown Host headers and direct origin access.

False positive notes:
If all traffic is forced through Cloudflare and Host is strictly controlled there, practical exploitability is low.

## Positive Controls Observed

- Admin mutations generally use CSRF-aware permission helpers, with tests enforcing coverage.
- `lib/csrf.ts` signs CSRF tokens, sets HttpOnly/SameSite cookies, and falls back to same-origin Origin/Referer validation.
- `components/StructuredData.tsx` serializes JSON-LD with script-safe escaping.
- File uploads generate server-side filenames, validate MIME/signatures, resize images, and keep slip proofs behind an authenticated admin image endpoint.
- Top-up approval status changes and wallet credits are atomic in the admin slip path.
- Gacha execution has production Redis enforcement for core locking and uses conditional balance/reward operations.
- `.env*` files are ignored, `.env.example` uses placeholders, and deploy validation checks key formats for several secrets.

## Suggested Remediation Order

1. Fix SweetAlert HTML interpolation and unsafe URL scheme validation first. These are the clearest XSS-class issues.
2. Remove or CSRF-protect `/api/auth/send-verification-email`.
3. Move all high-risk rate limits to distributed Redis helpers and tighten trusted IP handling.
4. Strengthen CSP and SVG/upload serving defaults.
5. Narrow API CORS and document any cross-origin requirement.
6. Review public analytics token scope and sanitize unexpected error responses.

