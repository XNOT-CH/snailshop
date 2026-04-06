import crypto from "node:crypto";

const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const ENCRYPTION_VERSION = "v1";
const DEFAULT_KEY_ID = "current";

// Development fallback - NOT safe for production (32 bytes exactly)
const DEV_FALLBACK_KEY = "gamestore-secret-key-12345678901";

function isHex(value: string) {
    return /^[0-9a-f]+$/i.test(value);
}

function parseEncryptionKey(rawKey: string): Buffer {
    if (/^[0-9a-f]{64}$/i.test(rawKey)) {
        return Buffer.from(rawKey, "hex");
    }

    if (Buffer.byteLength(rawKey, "utf8") === 32) {
        return Buffer.from(rawKey, "utf8");
    }

    try {
        const base64Buffer = Buffer.from(rawKey, "base64");
        if (base64Buffer.length === 32) {
            return base64Buffer;
        }
    } catch {
        // Ignore invalid base64 and fall through to the error below.
    }

    throw new Error(
        `[encryption] ENCRYPTION_KEY must be 32 bytes (utf8), 64 hex chars, or base64 for 32 bytes.`
    );
}

function parseKeyEntries(rawKeys: string): Map<string, Buffer> {
    const entries = new Map<string, Buffer>();

    for (const rawEntry of rawKeys.split(";")) {
        const entry = rawEntry.trim();
        if (!entry) {
            continue;
        }

        const separatorIndex = entry.indexOf("=");
        if (separatorIndex <= 0 || separatorIndex === entry.length - 1) {
            throw new Error(
                `[encryption] ENCRYPTION_PREVIOUS_KEYS entries must look like kid=key.`
            );
        }

        const keyId = entry.slice(0, separatorIndex).trim();
        const rawKey = entry.slice(separatorIndex + 1).trim();
        if (!keyId || !rawKey) {
            throw new Error(
                `[encryption] ENCRYPTION_PREVIOUS_KEYS entries must look like kid=key.`
            );
        }

        entries.set(keyId, parseEncryptionKey(rawKey));
    }

    return entries;
}

type EncryptionKeyring = {
    currentKeyId: string;
    currentKey: Buffer;
    allKeys: Map<string, Buffer>;
};

function decryptGcmWithKey(encryptionKey: Buffer, ivHex: string, encryptedTextHex: string, authTagHex: string) {
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedTextHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
}

function decryptCbcWithKey(encryptionKey: Buffer, ivHex: string, encryptedTextHex: string) {
    const iv = Buffer.from(ivHex, "hex");
    const encryptedText = Buffer.from(encryptedTextHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", encryptionKey, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString("utf8");
}

function tryDecryptWithAnyKey<T>(keys: Iterable<Buffer>, decryptor: (encryptionKey: Buffer) => T): T {
    let lastError: unknown;

    for (const encryptionKey of keys) {
        try {
            return decryptor(encryptionKey);
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError ?? new Error("Failed to decrypt sensitive data.");
}

/**
 * Lazily resolve the encryption key at runtime (not at module load time).
 * This prevents build-time failures when env vars are not available.
 * In production, ENCRYPTION_KEY MUST be set or the app will crash on startup.
 */
function getKeyring(): EncryptionKeyring {
    const key = process.env.ENCRYPTION_KEY;
    const currentKeyId = process.env.ENCRYPTION_KEY_ID?.trim() || DEFAULT_KEY_ID;
    const previousKeys = process.env.ENCRYPTION_PREVIOUS_KEYS?.trim();

    if (!key) {
        if (process.env.NODE_ENV === "production") {
            throw new Error("[encryption] ENCRYPTION_KEY environment variable is required in production.");
        }

        const devKey = Buffer.from(DEV_FALLBACK_KEY, "utf8");
        return {
            currentKeyId,
            currentKey: devKey,
            allKeys: new Map([[currentKeyId, devKey]]),
        };
    }

    const currentKey = parseEncryptionKey(key);
    const allKeys = new Map<string, Buffer>([[currentKeyId, currentKey]]);

    if (previousKeys) {
        for (const [keyId, parsedKey] of parseKeyEntries(previousKeys)) {
            if (allKeys.has(keyId)) {
                throw new Error(`[encryption] Duplicate encryption key id: ${keyId}`);
            }
            allKeys.set(keyId, parsedKey);
        }
    }

    return { currentKeyId, currentKey, allKeys };
}

function isEncryptedPayload(text: string): boolean {
    const parts = text.split(":");

    if (parts.length === 5 && parts[0] === ENCRYPTION_VERSION) {
        return Boolean(parts[1]) && isHex(parts[2]) && isHex(parts[3]) && isHex(parts[4]);
    }

    if (parts.length === 4 && parts[0] === ENCRYPTION_VERSION) {
        return isHex(parts[1]) && isHex(parts[2]) && isHex(parts[3]);
    }

    if (parts.length === 3) {
        return isHex(parts[0]) && isHex(parts[1]) && isHex(parts[2]);
    }

    if (parts.length === 2) {
        return isHex(parts[0]) && isHex(parts[1]);
    }

    return false;
}

/**
 * Encrypt sensitive data using AES-256-GCM (Authenticated Encryption)
 */
export function encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const { currentKey, currentKeyId } = getKeyring();
    const cipher = crypto.createCipheriv("aes-256-gcm", currentKey, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");

    return `${ENCRYPTION_VERSION}:${currentKeyId}:${iv.toString("hex")}:${encrypted}:${authTag}`;
}

/**
 * Decrypt sensitive data
 */
export function decrypt(text: string): string {
    if (!text) {
        return "";
    }

    const looksEncrypted = isEncryptedPayload(text);

    try {
        const parts = text.split(":");
        const { allKeys } = getKeyring();

        if (parts.length === 5 && parts[0] === ENCRYPTION_VERSION) {
            const keyId = parts[1];
            const selectedKey = allKeys.get(keyId);
            if (!selectedKey) {
                throw new Error(`Unknown encryption key id: ${keyId}`);
            }

            return decryptGcmWithKey(selectedKey, parts[2], parts[3], parts[4]);
        }

        if (parts.length === 4 && parts[0] === ENCRYPTION_VERSION) {
            return tryDecryptWithAnyKey(allKeys.values(), (encryptionKey) =>
                decryptGcmWithKey(encryptionKey, parts[1], parts[2], parts[3])
            );
        }

        if (parts.length === 3) {
            return tryDecryptWithAnyKey(allKeys.values(), (encryptionKey) =>
                decryptGcmWithKey(encryptionKey, parts[0], parts[1], parts[2])
            );
        }

        if (parts.length === 2) {
            return tryDecryptWithAnyKey(allKeys.values(), (encryptionKey) =>
                decryptCbcWithKey(encryptionKey, parts[0], parts[1])
            );
        }

        return text;
    } catch (error) {
        if (!looksEncrypted) {
            return text;
        }

        console.warn("[DECRYPT_FAILED]", error);
        throw new Error("Failed to decrypt sensitive data.");
    }
}

/**
 * Check if text is encrypted
 */
export function isEncrypted(text: string): boolean {
    if (!text) return false;

    const parts = text.split(":");
    if (parts.length === 5 && parts[0] === ENCRYPTION_VERSION) {
        return Boolean(parts[1])
            && parts[2].length === IV_LENGTH * 2
            && parts[4].length === AUTH_TAG_LENGTH * 2
            && isHex(parts[2])
            && isHex(parts[3])
            && isHex(parts[4]);
    }

    if (parts.length === 4 && parts[0] === ENCRYPTION_VERSION) {
        return parts[1].length === IV_LENGTH * 2
            && parts[3].length === AUTH_TAG_LENGTH * 2
            && isHex(parts[1])
            && isHex(parts[2])
            && isHex(parts[3]);
    }

    if (parts.length === 3) {
        return parts[0].length === IV_LENGTH * 2
            && parts[2].length === AUTH_TAG_LENGTH * 2
            && isHex(parts[0])
            && isHex(parts[1])
            && isHex(parts[2]);
    }

    if (parts.length === 2) {
        return parts[0].length === IV_LENGTH * 2 && isHex(parts[0]) && isHex(parts[1]);
    }

    return false;
}
