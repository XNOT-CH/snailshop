import crypto from "crypto";
import { db } from "@/lib/db";
import { hasPermission, Permission } from "@/lib/permissions";

/**
 * Generate a new API key
 * Returns the raw key (show once) and the hashed key (store in DB)
 */
export function generateApiKey(): { rawKey: string; hashedKey: string; prefix: string } {
    // Generate 32 random bytes = 64 hex characters
    const rawKey = crypto.randomBytes(32).toString("hex");
    const prefix = rawKey.substring(0, 8);

    // Hash the key for storage
    const hashedKey = crypto.createHash("sha256").update(rawKey).digest("hex");

    return { rawKey, hashedKey, prefix };
}

/**
 * Hash an API key for comparison
 */
export function hashApiKey(rawKey: string): string {
    return crypto.createHash("sha256").update(rawKey).digest("hex");
}

/**
 * Validate an API key and return the associated user/permissions
 */
export async function validateApiKey(rawKey: string): Promise<{
    valid: boolean;
    userId?: string;
    permissions?: string[];
    error?: string;
}> {
    if (!rawKey || rawKey.length !== 64) {
        return { valid: false, error: "Invalid API key format" };
    }

    const hashedKey = hashApiKey(rawKey);
    const prefix = rawKey.substring(0, 8);

    const apiKey = await db.apiKey.findFirst({
        where: {
            key: hashedKey,
            keyPrefix: prefix,
            isActive: true,
        },
        include: {
            user: {
                select: { id: true, role: true, permissions: true },
            },
        },
    });

    if (!apiKey) {
        return { valid: false, error: "API key not found or inactive" };
    }

    // Check expiration
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        return { valid: false, error: "API key expired" };
    }

    // Update last used
    await db.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
    });

    // Parse permissions (from API key or inherit from user)
    const permissions = apiKey.permissions
        ? JSON.parse(apiKey.permissions)
        : [];

    return {
        valid: true,
        userId: apiKey.userId,
        permissions,
    };
}

/**
 * Create a new API key for a user
 */
export async function createApiKey(
    userId: string,
    name: string,
    permissions?: string[],
    expiresInDays?: number
): Promise<{ id: string; rawKey: string }> {
    const { rawKey, hashedKey, prefix } = generateApiKey();

    const expiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : null;

    const apiKey = await db.apiKey.create({
        data: {
            name,
            key: hashedKey,
            keyPrefix: prefix,
            userId,
            permissions: permissions ? JSON.stringify(permissions) : null,
            expiresAt,
        },
    });

    return { id: apiKey.id, rawKey };
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(keyId: string): Promise<void> {
    await db.apiKey.update({
        where: { id: keyId },
        data: { isActive: false },
    });
}

/**
 * Check if API key has a specific permission
 */
export function apiKeyHasPermission(
    apiKeyPermissions: string[],
    userRole: string,
    userPermissions: string | null,
    requiredPermission: Permission
): boolean {
    // Check if permission is in API key's allowed permissions
    if (apiKeyPermissions.length > 0 && !apiKeyPermissions.includes(requiredPermission)) {
        return false;
    }

    // Check if user has the permission
    return hasPermission(userRole, requiredPermission, userPermissions);
}
