import crypto from "crypto";

const IV_LENGTH = 16;

// Development fallback — NOT safe for production (32 bytes exactly)
const DEV_FALLBACK_KEY = "gamestore-secret-key-12345678901";

/**
 * Lazily resolve the encryption key at runtime (not at module load time).
 * This prevents build-time failures when env vars are not available.
 * In production, ENCRYPTION_KEY MUST be set or the app will crash on startup.
 */
function getEncryptionKey(): string {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
        if (process.env.NODE_ENV === "production") {
            throw new Error("[encryption] ENCRYPTION_KEY environment variable is required in production.");
        }
        // Dev only: use well-known fallback (never expose real data with this key)
        return DEV_FALLBACK_KEY;
    }
    if (Buffer.byteLength(key, "utf8") !== 32) {
        throw new Error(`[encryption] ENCRYPTION_KEY must be exactly 32 bytes for AES-256, got ${Buffer.byteLength(key, "utf8")}.`);
    }
    return key;
}

/**
 * Encrypt sensitive data using AES-256-GCM (Authenticated Encryption)
 */
export function encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(
        "aes-256-gcm",
        Buffer.from(getEncryptionKey()),
        iv
    );
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    // Format: iv:encrypted_data:auth_tag
    return `${iv.toString("hex")}:${encrypted}:${authTag}`;
}

/**
 * Decrypt sensitive data
 */
export function decrypt(text: string): string {
    try {
        const parts = text.split(":");
        if (parts.length === 3) {
            // New GCM format: iv:encrypted:authTag
            const iv = Buffer.from(parts[0], "hex");
            const encryptedText = parts[1];
            const authTag = Buffer.from(parts[2], "hex");

            const decipher = crypto.createDecipheriv(
                "aes-256-gcm",
                Buffer.from(getEncryptionKey()),
                iv
            );
            decipher.setAuthTag(authTag);

            let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } else if (parts.length === 2) {
            // Legacy CBC format for backward compatibility
            const iv = Buffer.from(parts[0], "hex");
            const encryptedText = Buffer.from(parts[1], "hex");
            const decipher = crypto.createDecipheriv(
                "aes-256-cbc",
                Buffer.from(getEncryptionKey()),
                iv
            );
            let decrypted = decipher.update(encryptedText);
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            return decrypted.toString('utf8');
        }

        // Data is not encrypted, return as-is
        return text;
    } catch (error) {
        // If decryption fails, return original text (backward compatibility)
        return text;
    }
}

/**
 * Check if text is encrypted
 */
export function isEncrypted(text: string): boolean {
    const parts = text.split(":");
    if (parts.length !== 2) return false;
    // Check if both parts are valid hex strings
    const hexRegex = /^[0-9a-f]+$/i;
    return hexRegex.test(parts[0]) && hexRegex.test(parts[1]) && parts[0].length === 32;
}
