/**
 * Data Protection Utilities
 * Prevents sensitive data exposure in API responses and logs
 */

// Fields that should never be exposed in API responses
const SENSITIVE_FIELDS = [
    "password",
    "secretData",
    "key",           // API keys
    "token",         // Session tokens
    "hashedKey",
];

// Fields that should be masked (show partial)
const MASKED_FIELDS = [
    "email",
    "creditBalance",
    "ipAddress",
];

/**
 * Remove sensitive fields from an object
 */
export function sanitizeObject<T extends Record<string, unknown>>(
    obj: T,
    fieldsToRemove: string[] = SENSITIVE_FIELDS
): Partial<T> {
    const sanitized = { ...obj };

    for (const field of fieldsToRemove) {
        if (field in sanitized) {
            delete sanitized[field];
        }
    }

    return sanitized;
}

/**
 * Sanitize an array of objects
 */
export function sanitizeArray<T extends Record<string, unknown>>(
    arr: T[],
    fieldsToRemove: string[] = SENSITIVE_FIELDS
): Partial<T>[] {
    return arr.map(obj => sanitizeObject(obj, fieldsToRemove));
}

/**
 * Mask email address (show first 3 chars + domain)
 */
export function maskEmail(email: string): string {
    if (!email || !email.includes("@")) return "***@***.***";

    const [local, domain] = email.split("@");
    const maskedLocal = local.length > 3
        ? local.substring(0, 3) + "***"
        : "***";

    return `${maskedLocal}@${domain}`;
}

/**
 * Mask phone number (show last 4 digits)
 */
export function maskPhone(phone: string): string {
    if (!phone || phone.length < 4) return "****";
    return "***-***-" + phone.slice(-4);
}

/**
 * Mask IP address (show first and last octet)
 */
export function maskIpAddress(ip: string): string {
    if (!ip) return "*.*.*.* ";

    const parts = ip.split(".");
    if (parts.length !== 4) return ip; // IPv6 or invalid

    return `${parts[0]}.***.***. ${parts[3]}`;
}

/**
 * Mask credit card number (show last 4 digits)
 */
export function maskCreditCard(cardNumber: string): string {
    if (!cardNumber || cardNumber.length < 4) return "****";
    return "**** **** **** " + cardNumber.slice(-4);
}

/**
 * Mask API key (show prefix only)
 */
export function maskApiKey(key: string): string {
    if (!key || key.length < 8) return "********";
    return key.substring(0, 8) + "************************";
}

/**
 * Sanitize object for safe logging (removes sensitive data)
 */
export function sanitizeForLog<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
        // Skip sensitive fields entirely
        if (SENSITIVE_FIELDS.includes(key)) {
            sanitized[key] = "[REDACTED]";
            continue;
        }

        // Mask certain fields
        if (key === "email" && typeof value === "string") {
            sanitized[key] = maskEmail(value);
            continue;
        }

        if (key === "ipAddress" && typeof value === "string") {
            sanitized[key] = maskIpAddress(value);
            continue;
        }

        // Recursively sanitize nested objects
        if (value && typeof value === "object" && !Array.isArray(value)) {
            sanitized[key] = sanitizeForLog(value as Record<string, unknown>);
            continue;
        }

        sanitized[key] = value;
    }

    return sanitized;
}

/**
 * Safe console.log that sanitizes sensitive data
 */
export function safeLog(message: string, data?: Record<string, unknown>): void {
    if (data) {
        console.log(message, sanitizeForLog(data));
    } else {
        console.log(message);
    }
}

/**
 * Prepare user object for API response (removes sensitive fields)
 */
export function prepareUserForResponse(user: {
    id: string;
    username: string;
    email?: string | null;
    password?: string;
    role: string;
    permissions?: string | null;
    creditBalance?: unknown;
}) {
    return {
        id: user.id,
        username: user.username,
        email: user.email ? maskEmail(user.email) : null,
        role: user.role,
        // Never expose: password, permissions (internal)
    };
}

/**
 * Prepare product object for API response (customer view)
 */
export function prepareProductForCustomer(product: {
    id: string;
    name: string;
    description?: string | null;
    price: unknown;
    imageUrl?: string | null;
    category: string;
    isSold: boolean;
    secretData?: string;
}) {
    return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        imageUrl: product.imageUrl,
        category: product.category,
        isSold: product.isSold,
        // Never expose: secretData
    };
}

/**
 * Prepare product object for admin view (includes status but not secret)
 */
export function prepareProductForAdmin(product: {
    id: string;
    name: string;
    description?: string | null;
    price: unknown;
    imageUrl?: string | null;
    category: string;
    isSold: boolean;
    secretData?: string;
    orderId?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}) {
    return {
        ...prepareProductForCustomer(product),
        orderId: product.orderId,
        hasSecretData: !!product.secretData,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        // secretData only shown when product is purchased by the user
    };
}
