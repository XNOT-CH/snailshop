import crypto from "crypto";

// Get encryption key from environment or use a default (CHANGE IN PRODUCTION!)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "gamestore-secret-key-32-char!!"; // Must be 32 characters
const IV_LENGTH = 16;

/**
 * Encrypt sensitive data
 */
export function encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(
        "aes-256-cbc",
        Buffer.from(ENCRYPTION_KEY),
        iv
    );
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString("hex") + ":" + encrypted.toString("hex");
}

/**
 * Decrypt sensitive data
 */
export function decrypt(text: string): string {
    try {
        const parts = text.split(":");
        if (parts.length !== 2) {
            // Data is not encrypted, return as-is (for backward compatibility)
            return text;
        }
        const iv = Buffer.from(parts[0], "hex");
        const encryptedText = Buffer.from(parts[1], "hex");
        const decipher = crypto.createDecipheriv(
            "aes-256-cbc",
            Buffer.from(ENCRYPTION_KEY),
            iv
        );
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
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
