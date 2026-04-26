import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, users, roles } from "@/lib/db";
import { getUserPermissions } from "@/lib/permissions";
import {
    checkLoginRateLimit,
    clearLoginAttempts,
    getClientIp,
    getProgressiveDelay,
    recordFailedLogin,
    sleep,
} from "@/lib/rateLimit";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import { loginSchema } from "@/lib/validations";

export const LEGACY_LOGIN_DEPRECATED_MESSAGE =
    "Legacy login endpoint is disabled. Use NextAuth credentials sign-in instead.";

export type LoginFailureCode =
    | "INVALID_PAYLOAD"
    | "TURNSTILE_FAILED"
    | "RATE_LIMITED"
    | "INVALID_CREDENTIALS";

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
        return {
            success: false,
            status: 400,
            code: "INVALID_PAYLOAD",
            message: "กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน",
            ipAddress: clientIp,
        };
    }

    const { username, password, turnstileToken } = parsed.data;
    const identifier = `${clientIp}:${username}`;

    const turnstileResult = await verifyTurnstileToken(turnstileToken ?? undefined, clientIp);
    if (!turnstileResult.success) {
        return {
            success: false,
            status: 400,
            code: "TURNSTILE_FAILED",
            message: turnstileResult.message ?? "การยืนยันความปลอดภัยไม่สำเร็จ",
            ipAddress: clientIp,
        };
    }

    const rateLimit = checkLoginRateLimit(identifier);
    if (rateLimit.blocked) {
        return {
            success: false,
            status: 429,
            code: "RATE_LIMITED",
            message: rateLimit.message ?? "ล็อกอินบ่อยเกินไป กรุณาลองใหม่ภายหลัง",
            ipAddress: clientIp,
        };
    }

    const delay = getProgressiveDelay(identifier);
    if (delay > 0) {
        await sleep(delay);
    }

    const user = await db.query.users.findFirst({
        where: eq(users.username, username),
    });

    if (!user) {
        recordFailedLogin(identifier);
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
        recordFailedLogin(identifier);
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

    clearLoginAttempts(identifier);
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
