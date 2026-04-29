/**
 * Rate Limiter for protecting against brute force attacks
 * Uses in-memory storage (for single server setup)
 * For production with multiple servers, use Redis
 */
import { isRedisAvailable, redis } from "@/lib/redis";

interface RateLimitEntry {
    count: number;
    firstAttempt: number;
    lockedUntil?: number;
}

// In-memory store (reset on server restart)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration
const config = {
    // Login attempts
    login: {
        maxAttempts: 5,           // Max failed attempts
        windowMs: 15 * 60 * 1000, // 15 minutes window
        lockoutMs: 30 * 60 * 1000, // 30 minutes lockout
    },
    // General API rate limit
    api: {
        maxRequests: 100,         // Max requests per window
        windowMs: 60 * 1000,      // 1 minute window
    },
    // Registration limit
    register: {
        maxAttempts: 3,           // Max registrations per IP
        windowMs: 60 * 60 * 1000, // 1 hour window
    },
    // Password reset request
    passwordResetRequest: {
        maxAttempts: 3,
        windowMs: 15 * 60 * 1000,
    },
    // Password reset submit
    passwordResetAttempt: {
        maxAttempts: 5,
        windowMs: 30 * 60 * 1000,
    },
    // Chat image uploads
    chatImageUpload: {
        maxAttempts: 8,
        windowMs: 5 * 60 * 1000,
    },
    // Chat text messages
    chatMessage: {
        maxAttempts: 12,
        windowMs: 60 * 1000,
    },
    // Promo code validation
    promoValidate: {
        maxAttempts: 5,
        windowMs: 15 * 60 * 1000,
        lockoutMs: 15 * 60 * 1000,
    },
    // Purchase APIs
    purchase: {
        maxAttempts: 12,
        windowMs: 60 * 1000,
    },
    // Topup submit API
    topup: {
        maxAttempts: 6,
        windowMs: 10 * 60 * 1000,
    },
    // Gacha roll APIs
    gacha: {
        maxAttempts: 30,
        windowMs: 60 * 1000,
    },
};

/**
 * Check if a login attempt should be blocked
 * Returns { blocked: boolean, remainingAttempts: number, lockoutRemaining?: number }
 */
export function checkLoginRateLimit(identifier: string): {
    blocked: boolean;
    remainingAttempts: number;
    lockoutRemaining?: number;
    message?: string;
} {
    const key = `login:${identifier}`;
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    // Check if currently locked out
    if (entry?.lockedUntil && entry.lockedUntil > now) {
        const remainingMs = entry.lockedUntil - now;
        const remainingMinutes = Math.ceil(remainingMs / 60000);
        return {
            blocked: true,
            remainingAttempts: 0,
            lockoutRemaining: remainingMs,
            message: `บัญชีถูกล็อคชั่วคราว กรุณารอ ${remainingMinutes} นาที`,
        };
    }

    // Check if window expired, reset if so
    if (!entry || now - entry.firstAttempt > config.login.windowMs) {
        return {
            blocked: false,
            remainingAttempts: config.login.maxAttempts,
        };
    }

    // Check remaining attempts
    const remainingAttempts = config.login.maxAttempts - entry.count;

    if (remainingAttempts <= 0) {
        // Lock the account
        rateLimitStore.set(key, {
            ...entry,
            lockedUntil: now + config.login.lockoutMs,
        });

        const lockoutMinutes = Math.ceil(config.login.lockoutMs / 60000);
        return {
            blocked: true,
            remainingAttempts: 0,
            lockoutRemaining: config.login.lockoutMs,
            message: `ล็อกอินผิดหลายครั้งเกินไป กรุณารอ ${lockoutMinutes} นาที`,
        };
    }

    return {
        blocked: false,
        remainingAttempts,
    };
}

/**
 * Record a failed login attempt
 */
export function recordFailedLogin(identifier: string): void {
    const key = `login:${identifier}`;
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now - entry.firstAttempt > config.login.windowMs) {
        // Start new window
        rateLimitStore.set(key, {
            count: 1,
            firstAttempt: now,
        });
    } else {
        // Increment count
        rateLimitStore.set(key, {
            ...entry,
            count: entry.count + 1,
        });
    }
}

/**
 * Clear login attempts after successful login
 */
export function clearLoginAttempts(identifier: string): void {
    const key = `login:${identifier}`;
    rateLimitStore.delete(key);
}

type LoginRateLimitResult = {
    blocked: boolean;
    remainingAttempts: number;
    lockoutRemaining?: number;
    message?: string;
};

function getLoginLockMessage(remainingMs: number) {
    const remainingMinutes = Math.max(1, Math.ceil(remainingMs / 60000));
    return `บัญชีถูกล็อคชั่วคราว กรุณารอ ${remainingMinutes} นาที`;
}

export async function checkLoginRateLimitShared(identifier: string): Promise<LoginRateLimitResult> {
    if (!isRedisAvailable() || !redis) {
        return checkLoginRateLimit(identifier);
    }

    const counterKey = `login:${identifier}`;
    const lockKey = `login-lock:${identifier}`;

    try {
        const lockTtlSeconds = await redis.ttl(lockKey);
        if (lockTtlSeconds > 0) {
            const remainingMs = lockTtlSeconds * 1000;
            return {
                blocked: true,
                remainingAttempts: 0,
                lockoutRemaining: remainingMs,
                message: getLoginLockMessage(remainingMs),
            };
        }

        const count = Number(await redis.get(counterKey) ?? 0);
        const remainingAttempts = config.login.maxAttempts - count;
        if (remainingAttempts <= 0) {
            await redis.set(lockKey, "1", { ex: Math.ceil(config.login.lockoutMs / 1000) });
            return {
                blocked: true,
                remainingAttempts: 0,
                lockoutRemaining: config.login.lockoutMs,
                message: `ล็อกอินผิดหลายครั้งเกินไป กรุณารอ ${Math.ceil(config.login.lockoutMs / 60000)} นาที`,
            };
        }

        return {
            blocked: false,
            remainingAttempts,
        };
    } catch (error) {
        console.error("Redis login rate limit check failed, falling back to memory store:", error);
        return checkLoginRateLimit(identifier);
    }
}

export async function recordFailedLoginShared(identifier: string): Promise<void> {
    if (!isRedisAvailable() || !redis) {
        recordFailedLogin(identifier);
        return;
    }

    const counterKey = `login:${identifier}`;
    const lockKey = `login-lock:${identifier}`;

    try {
        const newCount = await redis.incr(counterKey);
        if (newCount === 1) {
            await redis.expire(counterKey, Math.ceil(config.login.windowMs / 1000));
        }

        if (newCount >= config.login.maxAttempts) {
            await redis.set(lockKey, "1", { ex: Math.ceil(config.login.lockoutMs / 1000) });
        }
    } catch (error) {
        console.error("Redis login failure record failed, falling back to memory store:", error);
        recordFailedLogin(identifier);
    }
}

export async function clearLoginAttemptsShared(identifier: string): Promise<void> {
    if (!isRedisAvailable() || !redis) {
        clearLoginAttempts(identifier);
        return;
    }

    try {
        await redis.del(`login:${identifier}`, `login-lock:${identifier}`);
    } catch (error) {
        console.error("Redis login attempt clear failed, falling back to memory store:", error);
        clearLoginAttempts(identifier);
    }
}

export async function getProgressiveDelayShared(identifier: string): Promise<number> {
    if (!isRedisAvailable() || !redis) {
        return getProgressiveDelay(identifier);
    }

    try {
        const count = Number(await redis.get(`login:${identifier}`) ?? 0);
        if (count <= 0) return 0;

        const delaySeconds = Math.pow(2, Math.min(count - 1, 5));
        return delaySeconds * 1000;
    } catch (error) {
        console.error("Redis login delay lookup failed, falling back to memory store:", error);
        return getProgressiveDelay(identifier);
    }
}

/**
 * Check general API rate limit by IP
 */
export function checkApiRateLimit(ip: string): {
    blocked: boolean;
    remainingRequests: number;
    retryAfter?: number;
} {
    const key = `api:${ip}`;
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now - entry.firstAttempt > config.api.windowMs) {
        // Start new window
        rateLimitStore.set(key, {
            count: 1,
            firstAttempt: now,
        });
        return {
            blocked: false,
            remainingRequests: config.api.maxRequests - 1,
        };
    }

    const newCount = entry.count + 1;
    rateLimitStore.set(key, {
        ...entry,
        count: newCount,
    });

    if (newCount > config.api.maxRequests) {
        const retryAfter = config.api.windowMs - (now - entry.firstAttempt);
        return {
            blocked: true,
            remainingRequests: 0,
            retryAfter,
        };
    }

    return {
        blocked: false,
        remainingRequests: config.api.maxRequests - newCount,
    };
}

/**
 * Check registration rate limit by IP
 */
export function checkRegisterRateLimit(ip: string): {
    blocked: boolean;
    message?: string;
} {
    const key = `register:${ip}`;
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now - entry.firstAttempt > config.register.windowMs) {
        rateLimitStore.set(key, {
            count: 1,
            firstAttempt: now,
        });
        return { blocked: false };
    }

    if (entry.count >= config.register.maxAttempts) {
        return {
            blocked: true,
            message: "สมัครสมาชิกเกินจำนวนครั้งที่กำหนด กรุณารอ 1 ชั่วโมง",
        };
    }

    rateLimitStore.set(key, {
        ...entry,
        count: entry.count + 1,
    });

    return { blocked: false };
}

export function checkPasswordResetRequestRateLimit(identifier: string): {
    blocked: boolean;
    remainingAttempts: number;
    retryAfter?: number;
    message?: string;
} {
    const result = checkWindowRateLimit(
        `password-reset-request:${identifier}`,
        config.passwordResetRequest.maxAttempts,
        config.passwordResetRequest.windowMs,
    );

    if (!result.blocked) {
        return result;
    }

    const retryAfterMinutes = Math.max(1, Math.ceil((result.retryAfter ?? 0) / 60000));
    return {
        ...result,
        message: `ขอรีเซ็ตรหัสผ่านบ่อยเกินไป กรุณารอประมาณ ${retryAfterMinutes} นาที`,
    };
}

export function checkPasswordResetAttemptRateLimit(identifier: string): {
    blocked: boolean;
    remainingAttempts: number;
    retryAfter?: number;
    message?: string;
} {
    const result = checkWindowRateLimit(
        `password-reset-attempt:${identifier}`,
        config.passwordResetAttempt.maxAttempts,
        config.passwordResetAttempt.windowMs,
    );

    if (!result.blocked) {
        return result;
    }

    const retryAfterMinutes = Math.max(1, Math.ceil((result.retryAfter ?? 0) / 60000));
    return {
        ...result,
        message: `ลองตั้งรหัสผ่านใหม่บ่อยเกินไป กรุณารอประมาณ ${retryAfterMinutes} นาที`,
    };
}

export async function checkPasswordResetRequestRateLimitShared(identifier: string): Promise<{
    blocked: boolean;
    remainingAttempts: number;
    retryAfter?: number;
    message?: string;
}> {
    const distributed = await checkDistributedWindowRateLimit(
        `password-reset-request:${identifier}`,
        config.passwordResetRequest.maxAttempts,
        config.passwordResetRequest.windowMs,
    );

    if (distributed) {
        if (!distributed.blocked) {
            return distributed;
        }

        const retryAfterMinutes = Math.max(1, Math.ceil((distributed.retryAfter ?? 0) / 60000));
        return {
            ...distributed,
            message: `ขอรีเซ็ตรหัสผ่านบ่อยเกินไป กรุณารอประมาณ ${retryAfterMinutes} นาที`,
        };
    }

    return checkPasswordResetRequestRateLimit(identifier);
}

export async function checkPasswordResetAttemptRateLimitShared(identifier: string): Promise<{
    blocked: boolean;
    remainingAttempts: number;
    retryAfter?: number;
    message?: string;
}> {
    const distributed = await checkDistributedWindowRateLimit(
        `password-reset-attempt:${identifier}`,
        config.passwordResetAttempt.maxAttempts,
        config.passwordResetAttempt.windowMs,
    );

    if (distributed) {
        if (!distributed.blocked) {
            return distributed;
        }

        const retryAfterMinutes = Math.max(1, Math.ceil((distributed.retryAfter ?? 0) / 60000));
        return {
            ...distributed,
            message: `ลองตั้งรหัสผ่านใหม่บ่อยเกินไป กรุณารอประมาณ ${retryAfterMinutes} นาที`,
        };
    }

    return checkPasswordResetAttemptRateLimit(identifier);
}

export function checkChatImageUploadRateLimit(identifier: string): {
    blocked: boolean;
    remainingUploads: number;
    retryAfter?: number;
    message?: string;
} {
    const key = `chat-image:${identifier}`;
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now - entry.firstAttempt > config.chatImageUpload.windowMs) {
        rateLimitStore.set(key, {
            count: 1,
            firstAttempt: now,
        });

        return {
            blocked: false,
            remainingUploads: config.chatImageUpload.maxAttempts - 1,
        };
    }

    const newCount = entry.count + 1;
    rateLimitStore.set(key, {
        ...entry,
        count: newCount,
    });

    if (newCount > config.chatImageUpload.maxAttempts) {
        const retryAfter = config.chatImageUpload.windowMs - (now - entry.firstAttempt);
        const retryAfterMinutes = Math.max(1, Math.ceil(retryAfter / 60000));

        return {
            blocked: true,
            remainingUploads: 0,
            retryAfter,
            message: `ส่งรูปได้บ่อยเกินไป กรุณารอประมาณ ${retryAfterMinutes} นาที`,
        };
    }

    return {
        blocked: false,
        remainingUploads: config.chatImageUpload.maxAttempts - newCount,
    };
}

export function checkChatMessageRateLimit(identifier: string): {
    blocked: boolean;
    remainingMessages: number;
    retryAfter?: number;
    message?: string;
} {
    const key = `chat-message:${identifier}`;
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now - entry.firstAttempt > config.chatMessage.windowMs) {
        rateLimitStore.set(key, {
            count: 1,
            firstAttempt: now,
        });

        return {
            blocked: false,
            remainingMessages: config.chatMessage.maxAttempts - 1,
        };
    }

    const newCount = entry.count + 1;
    rateLimitStore.set(key, {
        ...entry,
        count: newCount,
    });

    if (newCount > config.chatMessage.maxAttempts) {
        const retryAfter = config.chatMessage.windowMs - (now - entry.firstAttempt);
        const retryAfterSeconds = Math.max(1, Math.ceil(retryAfter / 1000));

        return {
            blocked: true,
            remainingMessages: 0,
            retryAfter,
            message: `ส่งข้อความถี่เกินไป กรุณารอประมาณ ${retryAfterSeconds} วินาที`,
        };
    }

    return {
        blocked: false,
        remainingMessages: config.chatMessage.maxAttempts - newCount,
    };
}

export function checkPromoValidationRateLimit(identifier: string): {
    blocked: boolean;
    remainingAttempts: number;
    lockoutRemaining?: number;
    message?: string;
} {
    const key = `promo-validate:${identifier}`;
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (entry?.lockedUntil && entry.lockedUntil > now) {
        const remainingMs = entry.lockedUntil - now;
        const remainingMinutes = Math.max(1, Math.ceil(remainingMs / 60000));
        return {
            blocked: true,
            remainingAttempts: 0,
            lockoutRemaining: remainingMs,
            message: `กรอกโค้ดผิดบ่อยเกินไป กรุณารอ ${remainingMinutes} นาที`,
        };
    }

    if (!entry || now - entry.firstAttempt > config.promoValidate.windowMs) {
        return {
            blocked: false,
            remainingAttempts: config.promoValidate.maxAttempts,
        };
    }

    const remainingAttempts = config.promoValidate.maxAttempts - entry.count;
    if (remainingAttempts <= 0) {
        rateLimitStore.set(key, {
            ...entry,
            lockedUntil: now + config.promoValidate.lockoutMs,
        });

        const lockoutMinutes = Math.ceil(config.promoValidate.lockoutMs / 60000);
        return {
            blocked: true,
            remainingAttempts: 0,
            lockoutRemaining: config.promoValidate.lockoutMs,
            message: `กรอกโค้ดผิดบ่อยเกินไป กรุณารอ ${lockoutMinutes} นาที`,
        };
    }

    return {
        blocked: false,
        remainingAttempts,
    };
}

export function recordFailedPromoValidation(identifier: string): void {
    const key = `promo-validate:${identifier}`;
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now - entry.firstAttempt > config.promoValidate.windowMs) {
        rateLimitStore.set(key, {
            count: 1,
            firstAttempt: now,
        });
        return;
    }

    rateLimitStore.set(key, {
        ...entry,
        count: entry.count + 1,
    });
}

export function clearPromoValidationAttempts(identifier: string): void {
    rateLimitStore.delete(`promo-validate:${identifier}`);
}

function checkWindowRateLimit(key: string, maxAttempts: number, windowMs: number) {
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now - entry.firstAttempt > windowMs) {
        rateLimitStore.set(key, {
            count: 1,
            firstAttempt: now,
        });
        return {
            blocked: false,
            remainingAttempts: maxAttempts - 1,
        };
    }

    const newCount = entry.count + 1;
    rateLimitStore.set(key, {
        ...entry,
        count: newCount,
    });

    if (newCount > maxAttempts) {
        const retryAfter = windowMs - (now - entry.firstAttempt);
        return {
            blocked: true,
            remainingAttempts: 0,
            retryAfter,
        };
    }

    return {
        blocked: false,
        remainingAttempts: maxAttempts - newCount,
    };
}

async function checkDistributedWindowRateLimit(
    key: string,
    maxAttempts: number,
    windowMs: number,
): Promise<{
    blocked: boolean;
    remainingAttempts: number;
    retryAfter?: number;
} | null> {
    if (!isRedisAvailable() || !redis) {
        return null;
    }

    try {
        const newCount = await redis.incr(key);
        if (newCount === 1) {
            await redis.expire(key, Math.ceil(windowMs / 1000));
        }

        const ttlSeconds = await redis.ttl(key);
        const retryAfter = ttlSeconds > 0 ? ttlSeconds * 1000 : undefined;

        if (newCount > maxAttempts) {
            return {
                blocked: true,
                remainingAttempts: 0,
                retryAfter,
            };
        }

        return {
            blocked: false,
            remainingAttempts: maxAttempts - newCount,
            retryAfter,
        };
    } catch (error) {
        console.error("Redis rate limit check failed, falling back to memory store:", error);
        return null;
    }
}

export function checkPurchaseRateLimit(identifier: string) {
    return checkWindowRateLimit(`purchase:${identifier}`, config.purchase.maxAttempts, config.purchase.windowMs);
}

export function checkTopupRateLimit(identifier: string) {
    return checkWindowRateLimit(`topup:${identifier}`, config.topup.maxAttempts, config.topup.windowMs);
}

export function checkGachaRateLimit(identifier: string) {
    return checkWindowRateLimit(`gacha:${identifier}`, config.gacha.maxAttempts, config.gacha.windowMs);
}

/**
 * Get client IP from request headers
 */
export function getClientIp(request: Request): string {
    // Check various headers for client IP
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
        return forwarded.split(",")[0].trim();
    }

    const realIp = request.headers.get("x-real-ip");
    if (realIp) {
        return realIp;
    }

    // Fallback
    return "unknown";
}

/**
 * Calculate progressive delay based on failed attempts
 * Returns delay in milliseconds
 */
export function getProgressiveDelay(identifier: string): number {
    const key = `login:${identifier}`;
    const entry = rateLimitStore.get(key);

    if (!entry) return 0;

    // Exponential backoff: 0, 1s, 2s, 4s, 8s...
    const delaySeconds = Math.pow(2, Math.min(entry.count - 1, 5));
    return delaySeconds * 1000;
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
