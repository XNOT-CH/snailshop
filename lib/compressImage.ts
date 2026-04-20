/**
 * Client-side image compression utility.
 * Compresses images to fit within a target file size (default: 300KB).
 * Uses Canvas API to re-encode images as WebP/JPEG with iterative quality reduction.
 */

async function compressWithCanvas(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    imageBitmap: ImageBitmap,
    startWidth: number,
    startHeight: number,
    maxSizeBytes: number,
): Promise<Blob | null> {
    const preferredOutputType = "image/webp";
    let quality = 0.85;
    let width = startWidth;
    let height = startHeight;
    let blob: Blob | null = null;

    for (let i = 0; i < 10; i++) {
        blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, preferredOutputType, quality));

        if (!blob || blob.size <= maxSizeBytes) {
            break;
        }

        quality -= 0.1;
        if (quality < 0.1) {
            width = Math.round(width * 0.75);
            height = Math.round(height * 0.75);
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(imageBitmap, 0, 0, width, height);
            quality = 0.5;
        }
    }

    return blob;
}

function getExtensionFromMimeType(mimeType: string) {
    switch (mimeType) {
        case "image/webp":
            return "webp";
        case "image/png":
            return "png";
        case "image/jpeg":
            return "jpg";
        default:
            return null;
    }
}

const DEFAULT_MAX_SIZE_BYTES = 300 * 1024; // 300KB
const MAX_GIF_SVG_SIZE = 2 * 1024 * 1024; // 2MB limit for GIF/SVG
const MAX_DIMENSION = 1920; // Max width/height

/**
 * Compress an image file to be within the target size.
 * @param file - The original image File
 * @param maxSizeBytes - Maximum file size in bytes (default: 300KB)
 * @returns A compressed File object
 */
export async function compressImage(
    file: File,
    maxSizeBytes: number = DEFAULT_MAX_SIZE_BYTES,
): Promise<File> {
    if (file.size <= maxSizeBytes) {
        return file;
    }

    if (!file.type.startsWith("image/")) {
        return file;
    }

    // GIF/SVG can't be canvas-compressed reliably, so keep the stricter 2MB limit.
    if (file.type === "image/gif" || file.type === "image/svg+xml") {
        if (file.size > MAX_GIF_SVG_SIZE) {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
            const fileLabel = file.type === "image/gif" ? "GIF" : "SVG";
            throw new Error(
                `ไฟล์ ${fileLabel} มีขนาด ${sizeMB}MB ซึ่งเกินขีดจำกัด 2MB สำหรับไฟล์ประเภทนี้ ระบบไม่สามารถย่ออัตโนมัติได้ กรุณาลดขนาดไฟล์ก่อนอัปโหลด`,
            );
        }

        return file;
    }

    const imageBitmap = await createImageBitmap(file);
    let { width, height } = imageBitmap;

    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("Canvas context not available");
    }

    ctx.drawImage(imageBitmap, 0, 0, width, height);

    const blob = await compressWithCanvas(canvas, ctx, imageBitmap, width, height, maxSizeBytes);
    if (!blob) {
        return file;
    }

    const outputMimeType = blob.type || file.type;
    const extension = getExtensionFromMimeType(outputMimeType);
    if (!extension) {
        return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}.${extension}`, {
        lastModified: Date.now(),
        type: outputMimeType,
    });
}
