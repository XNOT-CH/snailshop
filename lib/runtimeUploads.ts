import path from "node:path";

const UPLOADS_PUBLIC_PREFIX = "/uploads";
const RUNTIME_UPLOAD_ROOT = path.join(process.cwd(), "storage", "uploads");
const LEGACY_PUBLIC_UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

function normalizeUploadSuffix(publicPath: string) {
    if (!publicPath.startsWith(UPLOADS_PUBLIC_PREFIX)) {
        throw new Error(`Managed upload path must start with "${UPLOADS_PUBLIC_PREFIX}"`);
    }

    return publicPath.slice(UPLOADS_PUBLIC_PREFIX.length).replace(/^\/+/, "");
}

export function getRuntimeUploadDir(publicPath: string) {
    const suffix = normalizeUploadSuffix(publicPath);
    return suffix ? path.join(RUNTIME_UPLOAD_ROOT, suffix) : RUNTIME_UPLOAD_ROOT;
}

export function getLegacyPublicUploadDir(publicPath: string) {
    const suffix = normalizeUploadSuffix(publicPath);
    return suffix ? path.join(LEGACY_PUBLIC_UPLOAD_ROOT, suffix) : LEGACY_PUBLIC_UPLOAD_ROOT;
}

export function isSafeUploadSegment(segment: string) {
    return !!segment && !segment.includes("..") && segment === path.basename(segment);
}

export function buildUploadPublicPath(...segments: string[]) {
    const safeSegments = segments.filter(Boolean).map((segment) => segment.replace(/^\/+|\/+$/g, ""));
    return path.posix.join(UPLOADS_PUBLIC_PREFIX, ...safeSegments);
}
