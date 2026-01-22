import crypto from "crypto";
import { cookies } from "next/headers";

const CSRF_SECRET = process.env.CSRF_SECRET || "csrf-secret-key-32-characters!!";
const CSRF_TOKEN_NAME = "csrf_token";
const CSRF_COOKIE_NAME = "csrf_cookie";

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

    // Create a signed version for the cookie
    const hmac = crypto.createHmac("sha256", CSRF_SECRET);
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

    const cookieStore = await cookies();
    const cookieValue = cookieStore.get(CSRF_COOKIE_NAME)?.value;

    if (!cookieValue) return false;

    // Recreate the HMAC from the token
    const hmac = crypto.createHmac("sha256", CSRF_SECRET);
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

/**
 * Get CSRF token from request headers or body
 */
export function getCsrfTokenFromRequest(request: Request): string | null {
    // Check header first
    const headerToken = request.headers.get("X-CSRF-Token");
    if (headerToken) return headerToken;

    return null;
}
