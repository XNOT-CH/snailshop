import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { getContentTypeFromFilename, readUploadObject, storageKeyFromSegments } from "@/lib/cloudflareStorage";
import {
    buildUploadPublicPath,
    getLegacyPublicUploadDir,
    getRuntimeUploadDir,
    isSafeUploadSegment,
} from "@/lib/runtimeUploads";

export const runtime = "nodejs";

interface RouteParams {
    params: Promise<{ segments: string[] }>;
}

const MISSING_UPLOAD_IMAGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="18" fill="#eef2f7"/><path d="M27 66h42L56 51l-8 9-6-7-15 13Z" fill="#94a3b8"/><circle cx="36" cy="35" r="7" fill="#cbd5e1"/></svg>`;
const SVG_SANDBOX_CSP = "default-src 'none'; script-src 'none'; sandbox";

function sanitizeDispositionFilename(filename: string) {
    return filename.replace(/[^\w.\-]/g, "_").slice(0, 120) || "upload";
}

function getUploadSecurityHeaders(contentType: string, filename: string) {
    const headers: Record<string, string> = {
        "X-Content-Type-Options": "nosniff",
    };

    const isSvg = contentType.toLowerCase().startsWith("image/svg+xml") || filename.toLowerCase().endsWith(".svg");
    if (isSvg) {
        headers["Content-Security-Policy"] = SVG_SANDBOX_CSP;
        headers["Content-Disposition"] = `attachment; filename="${sanitizeDispositionFilename(filename)}"`;
    }

    return headers;
}

function missingUploadImageResponse(filename: string) {
    const contentType = getContentTypeFromFilename(filename);

    if (!contentType.startsWith("image/")) {
        return null;
    }

    return new NextResponse(MISSING_UPLOAD_IMAGE_SVG, {
        status: 200,
        headers: {
            "Cache-Control": "public, max-age=300",
            "Content-Length": String(Buffer.byteLength(MISSING_UPLOAD_IMAGE_SVG)),
            "Content-Type": "image/svg+xml; charset=utf-8",
            "Content-Security-Policy": SVG_SANDBOX_CSP,
            "X-Content-Type-Options": "nosniff",
            "X-Upload-Fallback": "missing-image",
        },
    });
}

function resolveUploadFilePath(segments: string[]) {
    if (segments.length === 0 || !segments.every(isSafeUploadSegment)) {
        return null;
    }

    const publicPath = buildUploadPublicPath(...segments.slice(0, -1));
    const filename = segments.at(-1);

    if (!filename) {
        return null;
    }

    const runtimeFilePath = path.join(getRuntimeUploadDir(publicPath), filename);
    if (existsSync(runtimeFilePath)) {
        return runtimeFilePath;
    }

    const legacyFilePath = path.join(getLegacyPublicUploadDir(publicPath), filename);
    if (existsSync(legacyFilePath)) {
        return legacyFilePath;
    }

    return null;
}

async function serveUploadFile(segments: string[], filename: string, cacheControl: string) {
    const storageKey = storageKeyFromSegments("uploads", ...segments);
    const r2Object = await readUploadObject(storageKey);
    if (r2Object) {
        return new NextResponse(r2Object.body, {
            status: 200,
            headers: {
                "Cache-Control": cacheControl,
                "Content-Length": String(r2Object.size),
                "Content-Type": r2Object.contentType,
                ...getUploadSecurityHeaders(r2Object.contentType, filename),
            },
        });
    }

    const filePath = resolveUploadFilePath(segments);
    if (!filePath) {
        return null;
    }

    const fileBuffer = await readFile(filePath);
    const contentType = getContentTypeFromFilename(filePath);

    return new NextResponse(new Uint8Array(fileBuffer), {
        status: 200,
        headers: {
            "Cache-Control": cacheControl,
            "Content-Length": String(fileBuffer.byteLength),
            "Content-Type": contentType,
            ...getUploadSecurityHeaders(contentType, filename),
        },
    });
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
    try {
        const { segments } = await params;
        const filename = segments.at(-1);

        if (segments.length === 0 || !filename || !segments.every(isSafeUploadSegment)) {
            return NextResponse.json({ success: false, message: "File not found" }, { status: 404 });
        }

        const served = await serveUploadFile(segments, filename, "public, max-age=31536000, immutable");
        if (served) {
            return served;
        }

        // Uploads that predate thumbnails only have the full-size file, so a
        // missing `.thumb.webp` falls back to the original. Cached briefly
        // (not immutable) in case a thumb is backfilled later.
        if (filename.endsWith(".thumb.webp")) {
            const baseFilename = filename.replace(/\.thumb\.webp$/, ".webp");
            const baseSegments = [...segments.slice(0, -1), baseFilename];
            const servedBase = await serveUploadFile(baseSegments, baseFilename, "public, max-age=3600");
            if (servedBase) {
                return servedBase;
            }
        }

        const fallback = missingUploadImageResponse(filename);
        if (fallback) {
            return fallback;
        }

        return NextResponse.json({ success: false, message: "File not found" }, { status: 404 });
    } catch (error) {
        console.error("[UPLOADS_GET]", error);
        return NextResponse.json({ success: false, message: "Failed to read file" }, { status: 500 });
    }
}
