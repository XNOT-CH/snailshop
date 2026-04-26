import type { NextAuthConfig } from "next-auth";
import {
    getAdminApiAccessResponse,
    getAdminPageAccessResponse,
    isProtectedPath,
} from "@/lib/adminAccess";

/**
 * Edge-compatible auth config (no DB / bcrypt imports).
 * Used by middleware.ts for route protection.
 */
export const authConfig: NextAuthConfig = {
    pages: {
        signIn: "/login",
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = Boolean(auth?.user);
            const pathname = nextUrl.pathname;

            // Paths that require authentication
            const isProtected = isProtectedPath(pathname);

            if (!isLoggedIn && isProtected) {
                return false; // Will redirect to /login
            }

            if (isLoggedIn && pathname.startsWith("/admin")) {
                const permissions = (auth?.user as { permissions?: string[] })?.permissions ?? [];
                return getAdminPageAccessResponse(pathname, permissions, nextUrl) ?? true;
            }

            if (isLoggedIn && pathname.startsWith("/api/admin")) {
                const permissions = (auth?.user as { permissions?: string[] })?.permissions ?? [];
                return getAdminApiAccessResponse(pathname, permissions) ?? true;
            }

            return true;
        },
        jwt({ token, user }) {
            // Persist user id and role into the JWT token
            if (user) {
                token.id = user.id;
                token.role = (user as { role?: string }).role ?? "USER";
                token.username = (user as { username?: string }).username ?? "";
                token.permissions = (user as { permissions?: string[] }).permissions ?? [];
            }
            return token;
        },
        session({ session, token }) {
            // Expose id and role on the session object
            if (token && session.user) {
                session.user.id = token.id as string;
                (session.user as { role?: string }).role = token.role as string;
                (session.user as { username?: string }).username = token.username as string;
                (session.user as { permissions?: string[] }).permissions = Array.isArray(token.permissions)
                    ? token.permissions as string[]
                    : [];
            }
            return session;
        },
    },
    providers: [], // Providers defined in auth.ts (Node.js runtime)
};
