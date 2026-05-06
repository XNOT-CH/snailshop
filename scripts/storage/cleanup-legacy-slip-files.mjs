import path from "node:path";
import crypto from "node:crypto";
import mysql from "mysql2/promise";
import { config } from "dotenv";
import { readdir, rm } from "node:fs/promises";

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
const LEGACY_SLIP_PATH_PREFIX = "/uploads/slips";
const LEGACY_SLIP_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "slips");

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

function decrypt(text) {
    if (!text) return "";

    const parts = text.split(":");
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

    return text;
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

async function collectReferencedLegacyFiles(connection) {
    const [rows] = await connection.query("SELECT proofImage FROM Topup WHERE proofImage IS NOT NULL");
    const referenced = new Set();

    for (const row of rows) {
        const value = typeof row.proofImage === "string" ? decrypt(row.proofImage) : "";
        if (value.startsWith(`${LEGACY_SLIP_PATH_PREFIX}/`) && !value.includes("..")) {
            referenced.add(value.slice(LEGACY_SLIP_PATH_PREFIX.length + 1));
        }
    }

    return referenced;
}

async function main() {
    const connection = await mysql.createConnection(normalizeDbUrl(databaseUrl));
    try {
        const referenced = await collectReferencedLegacyFiles(connection);
        let removed = 0;
        let kept = 0;

        const files = await readdir(LEGACY_SLIP_UPLOAD_DIR, { withFileTypes: true }).catch(() => []);
        for (const file of files) {
            if (!file.isFile()) {
                continue;
            }

            if (referenced.has(file.name)) {
                kept++;
                continue;
            }

            await rm(path.join(LEGACY_SLIP_UPLOAD_DIR, file.name), { force: true });
            removed++;
        }

        console.log("[cleanup-legacy-slip-files] Done.");
        console.log(JSON.stringify({ removed, kept }, null, 2));
    } finally {
        await connection.end();
    }
}

await main();
