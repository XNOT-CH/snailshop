import "server-only";

import crypto from "node:crypto";
import path from "node:path";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import {
    CHAT_ALLOWED_IMAGE_TYPES,
    CHAT_MAX_IMAGE_SIZE,
} from "@/lib/chatConstraints";
import { CHAT_IMAGE_TTL_MS } from "@/lib/chatMessageContent";

const CHAT_MEDIA_ROOT = path.join(process.cwd(), "storage", "chat-media");

const MIME_EXTENSION_MAP: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
};

function sanitizeFilename(filename: string) {
    return filename.replace(/[^\w.\-]/g, "_").slice(0, 120) || "image";
}

function isValidChatImageSignature(mimeType: (typeof CHAT_ALLOWED_IMAGE_TYPES)[number], buffer: Buffer) {
    if (buffer.length === 0) {
        return false;
    }

    if (mimeType === "image/png") {
        return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }

    if (mimeType === "image/jpeg") {
        return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }

    if (mimeType === "image/gif") {
        const header = buffer.subarray(0, 6).toString("ascii");
        return header === "GIF87a" || header === "GIF89a";
    }

    if (mimeType === "image/webp") {
        return (
            buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
            buffer.subarray(8, 12).toString("ascii") === "WEBP"
        );
    }

    return false;
}

function ensureSafeStoredName(storedName: string) {
    const safeName = path.basename(storedName);

    if (safeName !== storedName) {
        throw new Error("Invalid media filename");
    }

    return safeName;
}

async function ensureChatMediaDirectory() {
    await mkdir(CHAT_MEDIA_ROOT, { recursive: true });
}

export function validateChatImageFile(file: File) {
    if (!CHAT_ALLOWED_IMAGE_TYPES.includes(file.type as (typeof CHAT_ALLOWED_IMAGE_TYPES)[number])) {
        throw new Error("รองรับเฉพาะไฟล์ JPG, PNG, WebP และ GIF");
    }

    if (file.size === 0) {
        throw new Error("ไฟล์รูปว่างเปล่า กรุณาเลือกไฟล์ใหม่");
    }

    if (file.size > CHAT_MAX_IMAGE_SIZE) {
        throw new Error("ไฟล์รูปต้องมีขนาดไม่เกิน 3MB");
    }
}

export async function saveChatImageFile(file: File) {
    validateChatImageFile(file);
    await ensureChatMediaDirectory();

    const extension = MIME_EXTENSION_MAP[file.type] ?? "bin";
    const storedName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${extension}`;
    const filePath = path.join(CHAT_MEDIA_ROOT, storedName);
    const buffer = Buffer.from(await file.arrayBuffer());

    if (!isValidChatImageSignature(file.type as (typeof CHAT_ALLOWED_IMAGE_TYPES)[number], buffer)) {
        throw new Error("ไฟล์รูปไม่ถูกต้องหรือชนิดไฟล์ไม่ตรงกับข้อมูลจริง");
    }

    await writeFile(filePath, buffer);

    return {
        storedName,
        fileName: sanitizeFilename(file.name),
        mimeType: file.type,
        expiresAt: new Date(Date.now() + CHAT_IMAGE_TTL_MS).toISOString(),
    };
}

export async function readChatImageFile(storedName: string) {
    try {
        const filePath = path.join(CHAT_MEDIA_ROOT, ensureSafeStoredName(storedName));
        return await readFile(filePath);
    } catch {
        return null;
    }
}

export async function deleteChatImageFile(storedName: string | null | undefined) {
    if (!storedName) {
        return;
    }

    try {
        const filePath = path.join(CHAT_MEDIA_ROOT, ensureSafeStoredName(storedName));
        await unlink(filePath);
    } catch {
        // Ignore missing files during cleanup.
    }
}
