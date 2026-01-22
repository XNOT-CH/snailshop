/**
 * Rate Limiter for protecting against brute force attacks
 * Uses in-memory storage (for single server setup)
 * For production with multiple servers, use Redis
 */

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
