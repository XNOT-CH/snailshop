import path from "node:path";
import { readFile } from "node:fs/promises";
import {
    bufferToArrayBuffer,
    getContentTypeFromFilename,
    readUploadObject,
    storageKeyFromPublicUrl,
} from "@/lib/cloudflareStorage";
import { resolveManagedUploadPath } from "@/lib/serverImageUpload";

export const PRIVATE_SLIP_UPLOAD_DIR = path.join(process.cwd(), "storage", "private", "slips");
export const PRIVATE_SLIP_PATH_PREFIX = "/private/slips";
export const LEGACY_SLIP_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "slips");
export const LEGACY_SLIP_PATH_PREFIX = "/uploads/slips";

export function buildAdminSlipImageUrl(topupId: string, hasProofImage: boolean) {
    if (!hasProofImage) {
        return null;
    }

    return `/api/admin/slips/${topupId}/image`;
}

export function resolveStoredSlipPath(fileUrl: string) {
    return resolveManagedUploadPath(fileUrl, PRIVATE_SLIP_UPLOAD_DIR, PRIVATE_SLIP_PATH_PREFIX)
        ?? resolveManagedUploadPath(fileUrl, LEGACY_SLIP_UPLOAD_DIR, LEGACY_SLIP_PATH_PREFIX);
}

export async function readStoredSlipFile(fileUrl: string) {
    const r2Object = await readUploadObject(storageKeyFromPublicUrl(fileUrl));
    if (r2Object) {
        return r2Object;
    }

    const filePath = resolveStoredSlipPath(fileUrl);
    if (!filePath) {
        return null;
    }

    const body = await readFile(filePath);
    const filename = path.basename(filePath);

    return {
        body: bufferToArrayBuffer(body),
        contentType: getContentTypeFromFilename(filename),
        filename,
        size: body.byteLength,
    };
}
