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
