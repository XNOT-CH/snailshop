import crypto from "node:crypto";
import path from "node:path";
import { existsSync } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import sharp from "sharp";

const IMAGE_SIGNATURES = {
    "image/png": (buffer: Buffer) =>
        buffer.length >= 8 &&
        buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    "image/jpeg": (buffer: Buffer) =>
        buffer.length >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff,
    "image/gif": (buffer: Buffer) => {
        const header = buffer.subarray(0, 6).toString("ascii");
        return header === "GIF87a" || header === "GIF89a";
    },
    "image/webp": (buffer: Buffer) =>
        buffer.length >= 12 &&
        buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
        buffer.subarray(8, 12).toString("ascii") === "WEBP",
} as const;

type SupportedMimeType = keyof typeof IMAGE_SIGNATURES;

interface OptimizeUploadOptions {
    allowedTypes: readonly SupportedMimeType[];
    maxInputBytes: number;
    maxDimension?: number;
    outputQuality?: number;
    preserveAnimation?: boolean;
}

interface SaveOptimizedUploadOptions extends OptimizeUploadOptions {
    uploadDir: string;
    publicPath: string;
}

interface OptimizedUploadResult {
    buffer: Buffer;
    filename: string;
    mimeType: SupportedMimeType;
}

function isSupportedMimeType(mimeType: string): mimeType is SupportedMimeType {
    return mimeType in IMAGE_SIGNATURES;
}

function getFileExtension(mimeType: SupportedMimeType) {
    switch (mimeType) {
        case "image/jpeg":
            return "jpg";
        case "image/png":
            return "png";
        case "image/gif":
            return "gif";
        case "image/webp":
            return "webp";
    }
}

function buildStoredFilename(mimeType: SupportedMimeType) {
    const timestamp = Date.now();
    const randomStr = crypto.randomBytes(4).toString("hex");
    return `${timestamp}-${randomStr}.${getFileExtension(mimeType)}`;
}

export function sanitizeFilename(filename: string) {
    return filename.replace(/[^\w.\-]/g, "_").slice(0, 120) || "image";
}

export function validateImageFile(file: File, options: OptimizeUploadOptions) {
    const { allowedTypes, maxInputBytes } = options;

    if (!isSupportedMimeType(file.type) || !allowedTypes.includes(file.type)) {
        throw new Error("Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.");
    }

    if (file.size === 0) {
        throw new Error("Uploaded file is empty.");
    }

    if (file.size > maxInputBytes) {
        throw new Error(`File size exceeds ${Math.round(maxInputBytes / (1024 * 1024))}MB limit`);
    }
}

export function hasValidImageSignature(mimeType: SupportedMimeType, buffer: Buffer) {
    return IMAGE_SIGNATURES[mimeType](buffer);
}

export async function optimizeImageUpload(
    file: File,
    options: OptimizeUploadOptions
): Promise<OptimizedUploadResult> {
    const {
        allowedTypes,
        maxInputBytes,
        maxDimension = 1080,
        outputQuality = 82,
        preserveAnimation = true,
    } = options;

    validateImageFile(file, { allowedTypes, maxInputBytes, maxDimension, outputQuality, preserveAnimation });

    const originalMimeType = file.type as SupportedMimeType;
    const originalBuffer = Buffer.from(await file.arrayBuffer());

    if (!hasValidImageSignature(originalMimeType, originalBuffer)) {
        throw new Error("Invalid image file contents.");
    }

    if (originalMimeType === "image/gif" && preserveAnimation) {
        return {
            buffer: originalBuffer,
            filename: buildStoredFilename("image/gif"),
            mimeType: "image/gif",
        };
    }

    const optimizedBuffer = await sharp(originalBuffer, { animated: preserveAnimation })
        .rotate()
        .resize({
            width: maxDimension,
            height: maxDimension,
            fit: "inside",
            withoutEnlargement: true,
        })
        .webp({ quality: outputQuality })
        .toBuffer();

    return {
        buffer: optimizedBuffer,
        filename: buildStoredFilename("image/webp"),
        mimeType: "image/webp",
    };
}

export async function saveOptimizedImageUpload(file: File, options: SaveOptimizedUploadOptions) {
    const { uploadDir, publicPath, ...optimizeOptions } = options;
    const optimized = await optimizeImageUpload(file, optimizeOptions);

    if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
    }

    await writeFile(path.join(uploadDir, optimized.filename), optimized.buffer);

    return {
        filename: optimized.filename,
        mimeType: optimized.mimeType,
        url: `${publicPath}/${optimized.filename}`,
    };
}

export function isManagedUploadPath(fileUrl: string, publicPath: string) {
    if (!fileUrl.startsWith(`${publicPath}/`)) {
        return false;
    }

    return !fileUrl.includes("..");
}

export function resolveManagedUploadPath(fileUrl: string, uploadDir: string, publicPath: string) {
    if (!isManagedUploadPath(fileUrl, publicPath)) {
        return null;
    }

    const filename = fileUrl.slice(publicPath.length + 1);
    return path.join(uploadDir, filename);
}

export async function deleteManagedUpload(fileUrl: string | null | undefined, uploadDir: string, publicPath: string) {
    if (!fileUrl) {
        return false;
    }

    const filePath = resolveManagedUploadPath(fileUrl, uploadDir, publicPath);
    if (!filePath || !existsSync(filePath)) {
        return false;
    }

    await unlink(filePath);
    return true;
}
