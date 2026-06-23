import bcrypt from "bcryptjs";
import { eq, or } from "drizzle-orm";
import { db, users, roles } from "@/lib/db";
import { getUserPermissions } from "@/lib/permissions";
import {
    checkLoginIpRateLimitShared,
    checkLoginRateLimitShared,
    clearLoginAttemptsShared,
    getClientIp,
    getProgressiveLoginIpDelayShared,
    getProgressiveDelayShared,
    recordFailedLoginIpShared,
    recordFailedLoginShared,
    sleep,
} from "@/lib/rateLimit";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import { loginSchema } from "@/lib/validations";

export const LEGACY_LOGIN_DEPRECATED_MESSAGE =
    "Legacy login endpoint is disabled. Use NextAuth credentials sign-in instead.";

/**
 * Constant bcrypt hash (cost 10, matching how real passwords are hashed) used to
 * run a throwaway compare when the username does not exist. This keeps the
 * response time of "user not found" close to "wrong password" so attackers
 * cannot enumerate valid usernames via timing. Never matches any real password.
 */
const DUMMY_PASSWORD_HASH =
    "$2b$10$t21sBHsUFjAcnuNjBX5xL.UxGT7uteSXNWBXV9Bho75MQUB4a9AzW";

export type LoginFailureCode =
    | "INVALID_PAYLOAD"
    | "TURNSTILE_FAILED"
    | "RATE_LIMITED"
    | "INVALID_CREDENTIALS"
    | "ACCOUNT_BANNED";

type LoginPayload = {
    username?: unknown;
    password?: unknown;
    turnstileToken?: unknown;
};

type LoginRequestContext = {
    payload: LoginPayload;
    request?: Request;
    ipAddress?: string;
    onAudit?: (entry: {
        action: string;
        userId?: string;
        resourceName?: string;
        status: "SUCCESS" | "FAILURE";
        reason?: string;
        ipAddress?: string;
    }) => Promise<void>;
};

export type SuccessfulLoginUser = {
    id: string;
    name: string;
    email: string;
    image: string | null;
    role: string;
    username: string;
    permissions: string[];
};

type SuccessfulLoginResult = {
    success: true;
    user: SuccessfulLoginUser;
    ipAddress: string;
};

type FailedLoginResult = {
    success: false;
    status: number;
    code: LoginFailureCode;
    message: string;
    ipAddress: string;
};

export type LoginAttemptResult = SuccessfulLoginResult | FailedLoginResult;

function resolveLoginIpAddress(request?: Request, ipAddress?: string) {
    if (request) {
        return getClientIp(request);
    }

    if (ipAddress?.trim()) {
        return ipAddress.trim();
    }

    return "unknown";
}

async function writeAudit(
    onAudit: LoginRequestContext["onAudit"],
    entry: {
        action: string;
        userId?: string;
        resourceName?: string;
        status: "SUCCESS" | "FAILURE";
        reason?: string;
        ipAddress?: string;
    }
) {
    if (!onAudit) return;
    await onAudit(entry);
}

export async function authenticateLoginAttempt({
    payload,
    request,
    ipAddress,
    onAudit,
}: LoginRequestContext): Promise<LoginAttemptResult> {
    const parsed = loginSchema.safeParse(payload);
    const clientIp = resolveLoginIpAddress(request, ipAddress);

    if (!parsed.success) {
        await writeAudit(onAudit, {
            action: "LOGIN_FAILED",
            resourceName: typeof payload.username === "string" ? payload.username.trim() : undefined,
            status: "FAILURE",
            reason: "ข้อมูลล็อกอินไม่ครบถ้วน",
            ipAddress: clientIp,
        });

        return {
            success: false,
            status: 400,
            code: "INVALID_PAYLOAD",
            message: "กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน",
            ipAddress: clientIp,
        };
    }

    const { username, password, turnstileToken } = parsed.data;
    const rateLimitUsername = username.toLowerCase();
    const userIdentifier = `user:${rateLimitUsername}`;
    const ipIdentifier = clientIp;

    const turnstileResult = await verifyTurnstileToken(turnstileToken ?? undefined, clientIp);
    if (!turnstileResult.success) {
        await writeAudit(onAudit, {
            action: "LOGIN_FAILED",
            resourceName: username,
            status: "FAILURE",
            reason: "Turnstile verification failed",
            ipAddress: clientIp,
        });

        return {
            success: false,
            status: 400,
            code: "TURNSTILE_FAILED",
            message: turnstileResult.message ?? "การยืนยันความปลอดภัยไม่สำเร็จ",
            ipAddress: clientIp,
        };
    }

    const ipRateLimit = await checkLoginIpRateLimitShared(ipIdentifier);
    if (ipRateLimit.blocked) {
        await writeAudit(onAudit, {
            action: "LOGIN_FAILED",
            resourceName: username,
            status: "FAILURE",
            reason: "IP rate limited",
            ipAddress: clientIp,
        });

        return {
            success: false,
            status: 429,
            code: "RATE_LIMITED",
            message: ipRateLimit.message ?? "ล็อกอินบ่อยเกินไป กรุณาลองใหม่ภายหลัง",
            ipAddress: clientIp,
        };
    }

    const userRateLimit = await checkLoginRateLimitShared(userIdentifier);
    if (userRateLimit.blocked) {
        await writeAudit(onAudit, {
            action: "LOGIN_FAILED",
            resourceName: username,
            status: "FAILURE",
            reason: "User rate limited",
            ipAddress: clientIp,
        });

        return {
            success: false,
            status: 429,
            code: "RATE_LIMITED",
            message: userRateLimit.message ?? "ล็อกอินบ่อยเกินไป กรุณาลองใหม่ภายหลัง",
            ipAddress: clientIp,
        };
    }

    const delay = Math.max(
        await getProgressiveDelayShared(userIdentifier),
        await getProgressiveLoginIpDelayShared(ipIdentifier)
    );
    if (delay > 0) {
        await sleep(delay);
    }

    // The form accepts a username OR an email (see loginSchema message). Emails
    // are stored lower-cased at registration, so match the email column against
    // the normalized value while leaving the username match to MySQL's
    // case-insensitive collation.
    const user = await db.query.users.findFirst({
        where: or(
            eq(users.username, username),
            eq(users.email, rateLimitUsername)
        ),
    });

    if (!user) {
        // Run a throwaway compare so the "user not found" path costs roughly the
        // same time as the "wrong password" path below, preventing username
        // enumeration via response timing.
        await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
        await recordFailedLoginShared(userIdentifier);
        await recordFailedLoginIpShared(ipIdentifier);
        await writeAudit(onAudit, {
            action: "LOGIN_FAILED",
            resourceName: username,
            status: "FAILURE",
            reason: "ไม่พบผู้ใช้",
            ipAddress: clientIp,
        });
        return {
            success: false,
            status: 401,
            code: "INVALID_CREDENTIALS",
            message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
            ipAddress: clientIp,
        };
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
        await recordFailedLoginShared(userIdentifier);
        await recordFailedLoginIpShared(ipIdentifier);
        await writeAudit(onAudit, {
            action: "LOGIN_FAILED",
            userId: user.id,
            resourceName: username,
            status: "FAILURE",
            reason: "รหัสผ่านไม่ถูกต้อง",
            ipAddress: clientIp,
        });
        return {
            success: false,
            status: 401,
            code: "INVALID_CREDENTIALS",
            message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
            ipAddress: clientIp,
        };
    }

    // Credentials are valid — only now do we reveal a ban, so it cannot be used
    // to probe which accounts exist. Banned accounts are denied a session.
    if (user.bannedAt) {
        await writeAudit(onAudit, {
            action: "LOGIN_FAILED",
            userId: user.id,
            resourceName: username,
            status: "FAILURE",
            reason: "บัญชีถูกระงับการใช้งาน",
            ipAddress: clientIp,
        });
        return {
            success: false,
            status: 403,
            code: "ACCOUNT_BANNED",
            message: "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ",
            ipAddress: clientIp,
        };
    }

    await clearLoginAttemptsShared(userIdentifier);
    await writeAudit(onAudit, {
        action: "LOGIN",
        userId: user.id,
        resourceName: username,
        status: "SUCCESS",
        ipAddress: clientIp,
    });

    const roleRecord = await db.query.roles.findFirst({
        where: eq(roles.code, user.role),
        columns: { permissions: true },
    });

    return {
        success: true,
        ipAddress: clientIp,
        user: {
            id: user.id,
            name: user.name ?? user.username,
            email: user.email ?? "",
            image: user.image ?? null,
            role: user.role,
            username: user.username,
            permissions: getUserPermissions(user.role, roleRecord?.permissions ?? null),
        },
    };
}
