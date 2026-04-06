import crypto from "node:crypto";
import path from "node:path";
import mysql from "mysql2/promise";
import { mkdir, rename, access, copyFile, unlink } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
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
const PRIVATE_SLIP_PATH_PREFIX = "/private/slips";
const LEGACY_SLIP_PATH_PREFIX = "/uploads/slips";
const PRIVATE_SLIP_UPLOAD_DIR = path.join(process.cwd(), "storage", "private", "slips");
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

function encrypt(text) {
    const iv = crypto.randomBytes(16);
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

async function fileExists(filePath) {
    try {
        await access(filePath, fsConstants.F_OK);
        return true;
    } catch {
        return false;
    }
}

function getLegacyFilePath(fileUrl) {
    if (!fileUrl?.startsWith(`${LEGACY_SLIP_PATH_PREFIX}/`) || fileUrl.includes("..")) {
        return null;
    }

    const filename = fileUrl.slice(LEGACY_SLIP_PATH_PREFIX.length + 1);
    return {
        filename,
        sourcePath: path.join(LEGACY_SLIP_UPLOAD_DIR, filename),
        targetPath: path.join(PRIVATE_SLIP_UPLOAD_DIR, filename),
        privateUrl: `${PRIVATE_SLIP_PATH_PREFIX}/${filename}`,
    };
}

async function moveSlipFile(sourcePath, targetPath) {
    await mkdir(path.dirname(targetPath), { recursive: true });

    if (!(await fileExists(sourcePath))) {
        return false;
    }

    if (await fileExists(targetPath)) {
        await unlink(sourcePath).catch(() => {});
        return true;
    }

    try {
        await rename(sourcePath, targetPath);
    } catch {
        await copyFile(sourcePath, targetPath);
        await unlink(sourcePath);
    }

    return true;
}

async function migrateSlipFiles(connection) {
    const [rows] = await connection.query("SELECT id, proofImage FROM Topup WHERE proofImage IS NOT NULL");
    let moved = 0;
    let updated = 0;
    let missing = 0;

    for (const row of rows) {
        const decryptedProofImage = decrypt(row.proofImage);
        const legacy = getLegacyFilePath(decryptedProofImage);

        if (!legacy) {
            continue;
        }

        const movedFile = await moveSlipFile(legacy.sourcePath, legacy.targetPath);
        if (!movedFile) {
            missing++;
            continue;
        }

        moved++;
        const nextValue = encrypt(legacy.privateUrl);
        await connection.execute(
            "UPDATE Topup SET proofImage = ? WHERE id = ?",
            [nextValue, row.id]
        );
        updated++;
    }

    return { moved, updated, missing };
}

async function main() {
    const connection = await mysql.createConnection(normalizeDbUrl(databaseUrl));
    try {
        console.log("[migrate-slip-files] Starting migration...");
        await connection.beginTransaction();
        const result = await migrateSlipFiles(connection);
        await connection.commit();
        console.log("[migrate-slip-files] Done.");
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        await connection.rollback();
        console.error("[migrate-slip-files] Failed:", error);
        process.exitCode = 1;
    } finally {
        await connection.end();
    }
}

await main();
