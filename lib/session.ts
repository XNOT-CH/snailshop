import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const SESSION_COOKIE_NAME = "session_token";
const SESSION_EXPIRY_HOURS = 24; // Sessions expire after 24 hours
const SESSION_IDLE_TIMEOUT_HOURS = 2; // Sessions expire after 2 hours of inactivity

/**
 * Generate a cryptographically secure session token
 */
export function generateSessionToken(): string {
    return crypto.randomBytes(64).toString("hex");
}

/**
 * Create a new session for a user
 * This should be called after successful login
 */
export async function createSession(userId: string, rememberMe: boolean = false): Promise<string> {
    const token = generateSessionToken();
    const expiresAt = new Date();

    if (rememberMe) {
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    } else {
        expiresAt.setHours(expiresAt.getHours() + SESSION_EXPIRY_HOURS);
    }

    // Store session in database
    await db.session.create({
        data: {
            token,
            userId,
            expiresAt,
            lastActivity: new Date(),
            userAgent: "", // Can be set from request headers
            ipAddress: "", // Can be set from request
        },
    });

    // Set secure HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        expires: expiresAt,
    });

    return token;
}

/**
 * Validate session and update last activity
 * Returns userId if valid, null if invalid or expired
 */
export async function validateSession(): Promise<string | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
        return null;
    }

    const session = await db.session.findUnique({
        where: { token },
    });

    if (!session) {
        return null;
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
        await destroySession(token);
        return null;
    }

    // Check idle timeout
    const idleTimeout = new Date();
    idleTimeout.setHours(idleTimeout.getHours() - SESSION_IDLE_TIMEOUT_HOURS);

    if (session.lastActivity < idleTimeout) {
        await destroySession(token);
        return null;
    }

    // Update last activity
    await db.session.update({
        where: { token },
        data: { lastActivity: new Date() },
    });

    return session.userId;
}

/**
 * Regenerate session token (prevents session fixation)
 * Should be called after privilege escalation (e.g., login, password change)
 */
export async function regenerateSession(userId: string): Promise<string> {
    // Destroy all existing sessions for this user
    await db.session.deleteMany({
        where: { userId },
    });

    // Create new session
    return createSession(userId);
}

/**
 * Destroy a specific session
 */
export async function destroySession(token?: string): Promise<void> {
    const cookieStore = await cookies();

    if (!token) {
        token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    }

    if (token) {
        // Remove from database
        await db.session.deleteMany({
            where: { token },
        });
    }

    // Clear cookie
    cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Destroy all sessions for a user (logout from all devices)
 */
export async function destroyAllUserSessions(userId: string): Promise<void> {
    await db.session.deleteMany({
        where: { userId },
    });

    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Get current session info
 */
export async function getCurrentSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
        return null;
    }

    return db.session.findUnique({
        where: { token },
        include: { user: { select: { id: true, username: true, role: true } } },
    });
}
