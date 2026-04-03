import "server-only";

import crypto from "node:crypto";
import path from "node:path";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import {
    CHAT_ALLOWED_IMAGE_TYPES,
    CHAT_MAX_IMAGE_SIZE,
} from "@/lib/chatConstraints";
import { CHAT_IMAGE_TTL_MS } from "@/lib/chatMessageContent";
import { optimizeImageUpload, sanitizeFilename } from "@/lib/serverImageUpload";

const CHAT_MEDIA_ROOT = path.join(process.cwd(), "storage", "chat-media");

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

    const optimized = await optimizeImageUpload(file, {
        allowedTypes: CHAT_ALLOWED_IMAGE_TYPES,
        maxInputBytes: CHAT_MAX_IMAGE_SIZE,
        maxDimension: 1080,
        outputQuality: 80,
        preserveAnimation: true,
    });
    const extension = optimized.filename.split(".").pop() ?? "bin";
    const storedName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${extension}`;
    const filePath = path.join(CHAT_MEDIA_ROOT, storedName);

    await writeFile(filePath, optimized.buffer);

    return {
        storedName,
        fileName: sanitizeFilename(file.name),
        mimeType: optimized.mimeType,
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
