import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
    // Only run redirect logic in production
    if (process.env.NODE_ENV !== "production") {
        return undefined; // Pass through to the actual route
    }

    // Get the protocol from the request
    const proto = request.headers.get("x-forwarded-proto");
    const host = request.headers.get("host");

    // If HTTP, redirect to HTTPS
    if (proto === "http" && host) {
        const httpsUrl = `https://${host}${request.nextUrl.pathname}${request.nextUrl.search}`;
        return Response.redirect(httpsUrl, 301);
    }

    return undefined; // Pass through to the actual route
}

// Configure which paths the proxy runs on
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder assets
         * - api routes
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)",
    ],
};
