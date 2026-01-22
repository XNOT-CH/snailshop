import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    // Only run in production
    if (process.env.NODE_ENV !== "production") {
        return NextResponse.next();
    }

    // Get the protocol from the request
    const proto = request.headers.get("x-forwarded-proto");
    const host = request.headers.get("host");

    // If HTTP, redirect to HTTPS
    if (proto === "http" && host) {
        const httpsUrl = `https://${host}${request.nextUrl.pathname}${request.nextUrl.search}`;
        return NextResponse.redirect(httpsUrl, 301);
    }

    return NextResponse.next();
}

// Configure which paths the middleware runs on
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)",
    ],
};
