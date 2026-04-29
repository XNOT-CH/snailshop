import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import {
    getAdminApiAccessResponse,
    getAdminPageAccessResponse,
    isProtectedPath,
} from "@/lib/adminAccess";

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow local/container healthchecks to probe plain HTTP without redirect loops.
    if (pathname === "/api/health") {
        return;
    }

    // ─── HTTPS Redirect (Production only) ─────────────────────────────
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

    // ─── Auth Guard ────────────────────────────────────────────────────
    const isProtected = isProtectedPath(pathname);

    if (isProtected) {
        const session = await auth();
        const isApiRoute = pathname.startsWith("/api/");

        // Not logged in
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
            return getAdminPageAccessResponse(pathname, permissions, request.nextUrl) ?? undefined;
        }

        if (pathname.startsWith("/api/admin")) {
            const permissions = (session.user as { permissions?: string[] }).permissions ?? [];
            return getAdminApiAccessResponse(pathname, permissions) ?? undefined;
        }
    }
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/auth).*)",
    ],
};
