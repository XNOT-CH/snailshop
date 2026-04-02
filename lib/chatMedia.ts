import "server-only";

import crypto from "node:crypto";
import path from "node:path";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { CHAT_IMAGE_TTL_MS } from "@/lib/chatMessageContent";

export const CHAT_ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export const CHAT_MAX_IMAGE_SIZE = 5 * 1024 * 1024;

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

    if (file.size > CHAT_MAX_IMAGE_SIZE) {
        throw new Error("ไฟล์รูปต้องมีขนาดไม่เกิน 5MB");
    }
}

export async function saveChatImageFile(file: File) {
    validateChatImageFile(file);
    await ensureChatMediaDirectory();

    const extension = MIME_EXTENSION_MAP[file.type] ?? "bin";
    const storedName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${extension}`;
    const filePath = path.join(CHAT_MEDIA_ROOT, storedName);
    const buffer = Buffer.from(await file.arrayBuffer());

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
