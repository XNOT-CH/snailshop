import { getCloudflareContext } from "@opennextjs/cloudflare";

export type StoredObject = {
    body: ArrayBuffer;
    contentType: string;
    filename: string;
    size: number;
};

const CONTENT_TYPES: Record<string, string> = {
    avif: "image/avif",
    gif: "image/gif",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    png: "image/png",
    svg: "image/svg+xml",
    webp: "image/webp",
};

function getUploadsBucket() {
    try {
        return getCloudflareContext().env.UPLOADS_BUCKET;
    } catch {
        return null;
    }
}

export function getContentTypeFromFilename(filename: string) {
    const extension = filename.split(".").pop()?.toLowerCase() ?? "";
    return CONTENT_TYPES[extension] ?? "application/octet-stream";
}

export function bufferToArrayBuffer(buffer: Buffer) {
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

export function storageKeyFromPublicUrl(fileUrl: string) {
    return fileUrl.replace(/^\/+/, "");
}

export function storageKeyFromSegments(...segments: string[]) {
    return segments
        .map((segment) => segment.replace(/^\/+|\/+$/g, ""))
        .filter(Boolean)
        .join("/");
}

export async function putUploadObject(key: string, body: Uint8Array, contentType: string) {
    const bucket = getUploadsBucket();
    if (!bucket) {
        return false;
    }

    await bucket.put(key, body, {
        httpMetadata: {
            contentType,
        },
    });
    return true;
}

export async function readUploadObject(key: string): Promise<StoredObject | null> {
    const bucket = getUploadsBucket();
    if (!bucket) {
        return null;
    }

    const object = await bucket.get(key);
    if (!object) {
        return null;
    }

    const body = await object.arrayBuffer();
    const filename = key.split("/").pop() ?? "file";

    return {
        body,
        contentType: object.httpMetadata?.contentType ?? getContentTypeFromFilename(filename),
        filename,
        size: object.size,
    };
}

export async function deleteUploadObject(key: string) {
    const bucket = getUploadsBucket();
    if (!bucket) {
        return false;
    }

    await bucket.delete(key);
    return true;
}
