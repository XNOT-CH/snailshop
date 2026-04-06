import crypto from "node:crypto";
import mysql from "mysql2/promise";
import { config } from "dotenv";

config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
}

const encryptionKeyRaw = process.env.ENCRYPTION_KEY;
if (!encryptionKeyRaw) {
    throw new Error("ENCRYPTION_KEY is required.");
}

const ENCRYPTION_VERSION = "v1";
const DEFAULT_KEY_ID = "current";
const IV_LENGTH = 16;
const BATCH_SIZE = 100;

function isHex(value) {
    return /^[0-9a-f]+$/i.test(value);
}

function parseEncryptionKey(rawKey) {
    if (/^[0-9a-f]{64}$/i.test(rawKey)) {
        return Buffer.from(rawKey, "hex");
    }

    if (Buffer.byteLength(rawKey, "utf8") === 32) {
        return Buffer.from(rawKey, "utf8");
    }

    const base64Buffer = Buffer.from(rawKey, "base64");
    if (base64Buffer.length === 32) {
        return base64Buffer;
    }

    throw new Error("ENCRYPTION_KEY must be 32 bytes (utf8), 64 hex chars, or base64 for 32 bytes.");
}

function parseKeyEntries(rawKeys) {
    const entries = new Map();

    for (const rawEntry of rawKeys.split(";")) {
        const entry = rawEntry.trim();
        if (!entry) {
            continue;
        }

        const separatorIndex = entry.indexOf("=");
        if (separatorIndex <= 0 || separatorIndex === entry.length - 1) {
            throw new Error("ENCRYPTION_PREVIOUS_KEYS entries must look like kid=key.");
        }

        const keyId = entry.slice(0, separatorIndex).trim();
        const rawKey = entry.slice(separatorIndex + 1).trim();
        if (!keyId || !rawKey) {
            throw new Error("ENCRYPTION_PREVIOUS_KEYS entries must look like kid=key.");
        }

        entries.set(keyId, parseEncryptionKey(rawKey));
    }

    return entries;
}

const currentKeyId = process.env.ENCRYPTION_KEY_ID?.trim() || DEFAULT_KEY_ID;
const currentEncryptionKey = parseEncryptionKey(encryptionKeyRaw);
const encryptionKeys = new Map([[currentKeyId, currentEncryptionKey]]);

if (process.env.ENCRYPTION_PREVIOUS_KEYS?.trim()) {
    for (const [keyId, keyBuffer] of parseKeyEntries(process.env.ENCRYPTION_PREVIOUS_KEYS)) {
        if (encryptionKeys.has(keyId)) {
            throw new Error(`Duplicate encryption key id: ${keyId}`);
        }
        encryptionKeys.set(keyId, keyBuffer);
    }
}

function encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv("aes-256-gcm", currentEncryptionKey, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");
    return `${ENCRYPTION_VERSION}:${currentKeyId}:${iv.toString("hex")}:${encrypted}:${authTag}`;
}

function decryptGcmWithKey(encryptionKey, ivHex, encryptedTextHex, authTagHex) {
    const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    let decrypted = decipher.update(encryptedTextHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
}

function decryptCbcWithKey(encryptionKey, ivHex, encryptedTextHex) {
    const decipher = crypto.createDecipheriv("aes-256-cbc", encryptionKey, Buffer.from(ivHex, "hex"));
    let decrypted = decipher.update(Buffer.from(encryptedTextHex, "hex"));
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString("utf8");
}

function tryDecryptWithAnyKey(decryptor) {
    let lastError;

    for (const encryptionKey of encryptionKeys.values()) {
        try {
            return decryptor(encryptionKey);
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError ?? new Error("Failed to decrypt sensitive data.");
}

function isEncrypted(value) {
    if (!value) return false;

    const parts = value.split(":");
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

function decrypt(value) {
    if (!value) return "";

    const parts = value.split(":");
    if (parts.length === 5 && parts[0] === ENCRYPTION_VERSION) {
        const key = encryptionKeys.get(parts[1]);
        if (!key) {
            throw new Error(`Unknown encryption key id: ${parts[1]}`);
        }
        return decryptGcmWithKey(key, parts[2], parts[3], parts[4]);
    }

    if (parts.length === 4 && parts[0] === ENCRYPTION_VERSION) {
        return tryDecryptWithAnyKey((encryptionKey) => decryptGcmWithKey(encryptionKey, parts[1], parts[2], parts[3]));
    }

    if (parts.length === 3 && isHex(parts[0]) && isHex(parts[1]) && isHex(parts[2])) {
        return tryDecryptWithAnyKey((encryptionKey) => decryptGcmWithKey(encryptionKey, parts[0], parts[1], parts[2]));
    }

    if (parts.length === 2 && isHex(parts[0]) && isHex(parts[1])) {
        return tryDecryptWithAnyKey((encryptionKey) => decryptCbcWithKey(encryptionKey, parts[0], parts[1]));
    }

    return value;
}

function needsReencryption(value) {
    if (!isEncrypted(value)) {
        return true;
    }

    const parts = value.split(":");
    return !(parts.length === 5 && parts[0] === ENCRYPTION_VERSION && parts[1] === currentKeyId);
}

function hashSessionToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

function normalizeDbUrl(rawUrl) {
    try {
        const parsedUrl = new URL(rawUrl);
        if (parsedUrl.hostname === "localhost") {
            parsedUrl.hostname = "127.0.0.1";
        }
        return parsedUrl.toString();
    } catch {
        return rawUrl.replace("@localhost:", "@127.0.0.1:");
    }
}

async function migrateUsers(connection) {
    const fields = [
        "taxFullName",
        "taxPhone",
        "taxAddress",
        "taxProvince",
        "taxDistrict",
        "taxSubdistrict",
        "taxPostalCode",
        "shipFullName",
        "shipPhone",
        "shipAddress",
        "shipProvince",
        "shipDistrict",
        "shipSubdistrict",
        "shipPostalCode",
    ];

    const [rows] = await connection.query(
        `SELECT id, ${fields.map((field) => `\`${field}\``).join(", ")} FROM User`
    );

    let migrated = 0;
    for (const row of rows) {
        const updates = {};

        for (const field of fields) {
            const value = row[field];
            if (typeof value === "string" && value && needsReencryption(value)) {
                updates[field] = encrypt(decrypt(value));
            }
        }

        if (Object.keys(updates).length === 0) {
            continue;
        }

        const assignments = Object.keys(updates).map((field) => `\`${field}\` = ?`).join(", ");
        await connection.execute(
            `UPDATE User SET ${assignments} WHERE id = ?`,
            [...Object.values(updates), row.id]
        );
        migrated++;
    }

    return migrated;
}

async function migrateTopups(connection) {
    const fields = ["proofImage", "senderName", "receiverName", "receiverBank"];
    const [rows] = await connection.query(
        `SELECT id, ${fields.map((field) => `\`${field}\``).join(", ")} FROM Topup`
    );

    let migrated = 0;
    for (const row of rows) {
        const updates = {};

        for (const field of fields) {
            const value = row[field];
            if (typeof value === "string" && value && needsReencryption(value)) {
                updates[field] = encrypt(decrypt(value));
            }
        }

        if (Object.keys(updates).length === 0) {
            continue;
        }

        const assignments = Object.keys(updates).map((field) => `\`${field}\` = ?`).join(", ");
        await connection.execute(
            `UPDATE Topup SET ${assignments} WHERE id = ?`,
            [...Object.values(updates), row.id]
        );
        migrated++;
    }

    return migrated;
}

async function migrateSessions(connection) {
    let offset = 0;
    let migrated = 0;

    while (true) {
        const [rows] = await connection.query(
            "SELECT id, token FROM Session ORDER BY createdAt ASC LIMIT ? OFFSET ?",
            [BATCH_SIZE, offset]
        );

        if (!rows.length) {
            break;
        }

        for (const row of rows) {
            const token = row.token;
            if (typeof token !== "string" || token.length !== 128) {
                continue;
            }

            await connection.execute(
                "UPDATE Session SET token = ? WHERE id = ?",
                [hashSessionToken(token), row.id]
            );
            migrated++;
        }

        offset += rows.length;
    }

    return migrated;
}

async function main() {
    const connection = await mysql.createConnection(normalizeDbUrl(databaseUrl));
    try {
        console.log("[migrate-sensitive-data] Starting migration...");
        await connection.beginTransaction();

        const usersMigrated = await migrateUsers(connection);
        const topupsMigrated = await migrateTopups(connection);
        const sessionsMigrated = await migrateSessions(connection);

        await connection.commit();
        console.log("[migrate-sensitive-data] Done.");
        console.log(JSON.stringify({
            usersMigrated,
            topupsMigrated,
            sessionsMigrated,
        }, null, 2));
    } catch (error) {
        await connection.rollback();
        console.error("[migrate-sensitive-data] Failed:", error);
        process.exitCode = 1;
    } finally {
        await connection.end();
    }
}

await main();
