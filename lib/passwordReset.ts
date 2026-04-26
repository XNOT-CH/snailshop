import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { absoluteUrl } from "@/lib/seo";

const PASSWORD_RESET_TOKEN_VERSION = 1;
export const PASSWORD_RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

type PasswordResetPayload = {
    v: number;
    sub: string;
    exp: number;
    pwd: string;
};

function toBase64Url(value: string) {
    return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
    return Buffer.from(value, "base64url").toString("utf8");
}

function getPasswordResetSecret() {
    const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
    if (!secret) {
        throw new Error("Password reset is not configured");
    }

    return secret;
}

export function createPasswordFingerprint(passwordHash: string) {
    return createHash("sha256").update(passwordHash).digest("hex").slice(0, 16);
}

function signPasswordResetPayload(encodedPayload: string) {
    return createHmac("sha256", getPasswordResetSecret())
        .update(encodedPayload)
        .digest("base64url");
}

export function createPasswordResetToken({
    userId,
    passwordHash,
    now = Date.now(),
}: {
    userId: string;
    passwordHash: string;
    now?: number;
}) {
    const payload: PasswordResetPayload = {
        v: PASSWORD_RESET_TOKEN_VERSION,
        sub: userId,
        exp: now + PASSWORD_RESET_TOKEN_TTL_MS,
        pwd: createPasswordFingerprint(passwordHash),
    };

    const encodedPayload = toBase64Url(JSON.stringify(payload));
    const signature = signPasswordResetPayload(encodedPayload);

    return `${encodedPayload}.${signature}`;
}

export function verifyPasswordResetToken(token: string, now = Date.now()) {
    const [encodedPayload, providedSignature] = token.split(".");
    if (!encodedPayload || !providedSignature) {
        return { success: false as const, message: "ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้อง" };
    }

    const expectedSignature = signPasswordResetPayload(encodedPayload);
    const signaturesMatch =
        providedSignature.length === expectedSignature.length &&
        timingSafeEqual(Buffer.from(providedSignature), Buffer.from(expectedSignature));

    if (!signaturesMatch) {
        return { success: false as const, message: "ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้อง" };
    }

    let payload: PasswordResetPayload;
    try {
        payload = JSON.parse(fromBase64Url(encodedPayload)) as PasswordResetPayload;
    } catch {
        return { success: false as const, message: "ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้อง" };
    }

    if (
        payload.v !== PASSWORD_RESET_TOKEN_VERSION ||
        !payload.sub ||
        !payload.pwd ||
        typeof payload.exp !== "number"
    ) {
        return { success: false as const, message: "ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้อง" };
    }

    if (payload.exp < now) {
        return { success: false as const, message: "ลิงก์รีเซ็ตรหัสผ่านหมดอายุแล้ว" };
    }

    return {
        success: true as const,
        userId: payload.sub,
        passwordFingerprint: payload.pwd,
        expiresAt: payload.exp,
    };
}

export function buildPasswordResetUrl(token: string) {
    return absoluteUrl(`/reset-password?token=${encodeURIComponent(token)}`);
}
