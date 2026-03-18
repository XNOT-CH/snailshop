import type { NextRequest } from "next/server";
import { auth } from "@/auth";

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // ─── HTTPS Redirect (Production only) ─────────────────────────────
    if (process.env.NODE_ENV === "production") {
        const proto = request.headers.get("x-forwarded-proto");
        const host = request.headers.get("host");
        if (proto === "http" && host) {
            const httpsUrl = `https://${host}${pathname}${request.nextUrl.search}`;
            return Response.redirect(httpsUrl, 301);
        }
    }

    // ─── Auth Guard ────────────────────────────────────────────────────
    const isProtected =
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/admin") ||
        pathname.startsWith("/api/admin") ||
        pathname.startsWith("/profile");

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
            loginUrl.searchParams.set("callbackUrl", pathname);
            return Response.redirect(loginUrl);
        }

        // Not admin → block admin paths
        const isAdminPath =
            pathname.startsWith("/admin") ||
            pathname.startsWith("/api/admin");

        if (isAdminPath) {
            const role = (session.user as { role?: string }).role;
            if (role !== "ADMIN") {
                if (isApiRoute) {
                    return new Response(
                        JSON.stringify({ success: false, message: "ไม่มีสิทธิ์เข้าถึง" }),
                        { status: 403, headers: { "Content-Type": "application/json" } }
                    );
                }
                return Response.redirect(new URL("/", request.nextUrl.origin));
            }
        }
    }
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/auth).*)",
    ],
};
