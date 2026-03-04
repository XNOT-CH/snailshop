import crypto from "crypto";
import { cookies } from "next/headers";
import { db, sessions, users } from "@/lib/db";
import { eq } from "drizzle-orm";

const SESSION_COOKIE_NAME = "session_token";
const SESSION_EXPIRY_HOURS = 24;
const SESSION_IDLE_TIMEOUT_HOURS = 2;

export function generateSessionToken(): string {
    return crypto.randomBytes(64).toString("hex");
}

export async function createSession(userId: string, rememberMe: boolean = false): Promise<string> {
    const token = generateSessionToken();
    const expiresAt = new Date();

    if (rememberMe) {
        expiresAt.setDate(expiresAt.getDate() + 7);
    } else {
        expiresAt.setHours(expiresAt.getHours() + SESSION_EXPIRY_HOURS);
    }

    await db.insert(sessions).values({
        token,
        userId,
        expiresAt: expiresAt.toISOString().slice(0, 19).replace("T", " "),
        lastActivity: new Date().toISOString().slice(0, 19).replace("T", " "),
        userAgent: "",
        ipAddress: "",
    });

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

export async function validateSession(): Promise<string | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) return null;

    const session = await db.query.sessions.findFirst({
        where: eq(sessions.token, token),
    });

    if (!session) return null;

    if (new Date(session.expiresAt) < new Date()) {
        await destroySession(token);
        return null;
    }

    const idleTimeout = new Date();
    idleTimeout.setHours(idleTimeout.getHours() - SESSION_IDLE_TIMEOUT_HOURS);

    if (new Date(session.lastActivity) < idleTimeout) {
        await destroySession(token);
        return null;
    }

    await db.update(sessions)
        .set({ lastActivity: new Date().toISOString().slice(0, 19).replace("T", " ") })
        .where(eq(sessions.token, token));

    return session.userId;
}

export async function regenerateSession(userId: string): Promise<string> {
    await db.delete(sessions).where(eq(sessions.userId, userId));
    return createSession(userId);
}

export async function destroySession(token?: string): Promise<void> {
    const cookieStore = await cookies();

    if (!token) {
        token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    }

    if (token) {
        await db.delete(sessions).where(eq(sessions.token, token));
    }

    cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function destroyAllUserSessions(userId: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.userId, userId));
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) return null;

    return db.query.sessions.findFirst({
        where: eq(sessions.token, token),
        with: {
            user: {
                columns: { id: true, username: true, role: true },
            },
        },
    });
}
