import { NextResponse, type NextRequest } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import {
    getAdminApiAccessResponse,
    getAdminPageAccessResponse,
    isProtectedPath,
} from "@/lib/adminAccess";

const { auth } = NextAuth(authConfig);

const isProduction = process.env.NODE_ENV === "production";

// The CSP lives here, not in next.config.ts, because the nonce has to be new on
// every response and next.config headers are static. Every other security
// header is still declared there.
//
// Dropping 'unsafe-inline' from script-src is the point: with it, any HTML an
// attacker manages to inject executes. A nonce is unguessable and per-response,
// so only the inline scripts this app rendered run.
//
// No 'strict-dynamic' on purpose — it makes the browser ignore 'self' and trust
// whatever a trusted script loads, which changes how every chunk and the
// Turnstile loader resolve. 'self' plus a nonce already closes the injection
// hole this was written for.
//
// style-src keeps 'unsafe-inline': Tailwind and the theme variables emit inline
// style attributes no nonce can cover, and injected CSS is a far smaller
// problem than injected script.
export function buildCsp(nonce: string) {
    return [
        "default-src 'self'",
        // 'unsafe-eval' is dev-only: HMR and React Fast Refresh eval code.
        `script-src 'self' 'nonce-${nonce}'${isProduction ? "" : " 'unsafe-eval'"} https://challenges.cloudflare.com`,
        "style-src 'self' 'unsafe-inline'",
        // Dev serves managed uploads from the sidecar on :3001.
        `img-src 'self' data: blob: https:${isProduction ? "" : " http://localhost:3001"}`,
        "font-src 'self' data:",
        "connect-src 'self' https://challenges.cloudflare.com",
        // youtube-nocookie hosts the embedded help-center videos.
        "frame-src https://challenges.cloudflare.com https://www.youtube-nocookie.com",
        "worker-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'self'",
    ].join("; ");
}

// Next reads the nonce back out of the CSP on the *request* headers to tag its
// own bootstrap and hydration scripts; x-nonce is what our inline scripts read
// through headers(). Both are needed.
function continueWithCsp(request: NextRequest) {
    const nonce = btoa(crypto.randomUUID());
    const csp = buildCsp(nonce);

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", csp);

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("Content-Security-Policy", csp);

    return response;
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow local/container healthchecks to probe plain HTTP without redirect loops.
    if (pathname === "/api/health") {
        return;
    }

    // The homepage moved from /home to /. Redirecting here (not in the page)
    // returns a real HTTP 308 — a page-level redirect gets swallowed by
    // streaming (the layout shell commits a 200 first, leaving only a meta
    // refresh), which is a weaker signal for crawlers and old links.
    if (pathname === "/home") {
        const homeUrl = new URL(`/${request.nextUrl.search}`, request.nextUrl.origin);
        return Response.redirect(homeUrl, 308);
    }

    if (process.env.NODE_ENV === "production") {
        const proto = request.headers.get("x-forwarded-proto");
        const host = request.headers.get("host");
        const hostname = host?.split(":")[0]?.toLowerCase();
        const isLocalHost =
            hostname === "localhost" ||
            hostname === "127.0.0.1" ||
            hostname === "::1";

        if (proto === "http" && host && !isLocalHost) {
            const httpsUrl = `https://${host}${pathname}${request.nextUrl.search}`;
            return Response.redirect(httpsUrl, 301);
        }
    }

    const isProtected = isProtectedPath(pathname);

    if (isProtected) {
        const session = await auth();
        const isApiRoute = pathname.startsWith("/api/");

        if (!session?.user) {
            if (isApiRoute) {
                return new Response(
                    JSON.stringify({ success: false, message: "ไม่ได้เข้าสู่ระบบ" }),
                    { status: 401, headers: { "Content-Type": "application/json" } }
                );
            }

            const loginUrl = new URL("/login", request.nextUrl.origin);
            loginUrl.searchParams.set("callbackUrl", `${pathname}${request.nextUrl.search}`);
            return Response.redirect(loginUrl);
        }

        if (pathname.startsWith("/admin")) {
            const permissions = (session.user as { permissions?: string[] }).permissions ?? [];
            return getAdminPageAccessResponse(pathname, permissions, request.nextUrl)
                ?? continueWithCsp(request);
        }

        if (pathname.startsWith("/api/admin")) {
            const permissions = (session.user as { permissions?: string[] }).permissions ?? [];
            return getAdminApiAccessResponse(pathname, permissions) ?? continueWithCsp(request);
        }
    }

    return continueWithCsp(request);
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/auth).*)",
    ],
};
