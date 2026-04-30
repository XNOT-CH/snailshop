import crypto from "node:crypto";
import { cookies } from "next/headers";

const CSRF_COOKIE_NAME = "csrf_cookie";

function getCsrfSecret(): string {
    const csrfSecret = process.env.CSRF_SECRET;
    if (!csrfSecret && process.env.NODE_ENV === "production") {
        throw new Error("[csrf] CSRF_SECRET environment variable is required in production.");
    }

    return csrfSecret ?? "csrf-secret-key-32-characters!!"; // dev only fallback
}

/**
 * Generate a CSRF token
 */
export function generateCsrfToken(): string {
    return crypto.randomBytes(32).toString("hex");
}

/**
 * Create CSRF token pair (one for cookie, one for form)
 */
export async function createCsrfTokenPair(): Promise<{ token: string; cookieValue: string }> {
    const token = generateCsrfToken();
    const csrfSecret = getCsrfSecret();

    // Create a signed version for the cookie
    const hmac = crypto.createHmac("sha256", csrfSecret);
    hmac.update(token);
    const cookieValue = hmac.digest("hex");

    // Set the cookie
    const cookieStore = await cookies();
    cookieStore.set(CSRF_COOKIE_NAME, cookieValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60, // 1 hour
    });

    return { token, cookieValue };
}

/**
 * Validate CSRF token from request
 */
export async function validateCsrfToken(token: string): Promise<boolean> {
    if (!token) return false;
    const csrfSecret = getCsrfSecret();

    const cookieStore = await cookies();
    const cookieValue = cookieStore.get(CSRF_COOKIE_NAME)?.value;

    if (!cookieValue) return false;

    // Recreate the HMAC from the token
    const hmac = crypto.createHmac("sha256", csrfSecret);
    hmac.update(token);
    const expectedCookieValue = hmac.digest("hex");

    // Compare using timing-safe comparison
    try {
        return crypto.timingSafeEqual(
            Buffer.from(cookieValue),
            Buffer.from(expectedCookieValue)
        );
    } catch {
        return false;
    }
}

function normalizeOrigin(value: string | null) {
    if (!value) return null;

    try {
        return new URL(value).origin;
    } catch {
        return null;
    }
}

function getRequestOrigin(request: Request) {
    const origin = normalizeOrigin(request.headers.get("origin"));
    if (origin) return origin;

    const referer = request.headers.get("referer");
    if (!referer) return null;

    try {
        return new URL(referer).origin;
    } catch {
        return null;
    }
}

function getTrustedOrigins(request: Request) {
    const requestUrl = new URL(request.url);
    const trusted = new Set<string>([requestUrl.origin]);

    for (const rawOrigin of [
        process.env.ALLOWED_ORIGIN,
        process.env.NEXT_PUBLIC_SITE_URL,
        process.env.AUTH_URL,
    ]) {
        const normalized = normalizeOrigin(rawOrigin ?? null);
        if (normalized) trusted.add(normalized);
    }

    return trusted;
}

export function isSameOriginRequest(request: Request): boolean {
    const requestOrigin = getRequestOrigin(request);
    if (!requestOrigin) return false;

    return getTrustedOrigins(request).has(requestOrigin);
}

export async function validateCsrfRequest(request: Request): Promise<boolean> {
    const csrfToken = getCsrfTokenFromRequest(request);
    if (csrfToken && await validateCsrfToken(csrfToken)) {
        return true;
    }

    return isSameOriginRequest(request);
}

/**
 * Get CSRF token from request headers or body
 */
export function getCsrfTokenFromRequest(request: Request): string | null {
    // Check header first
    const headerToken = request.headers.get("X-CSRF-Token");
    if (headerToken) return headerToken;

    return null;
}
