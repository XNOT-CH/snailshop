import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import {
    buildUploadPublicPath,
    getLegacyPublicUploadDir,
    getRuntimeUploadDir,
    isSafeUploadSegment,
} from "@/lib/runtimeUploads";

export const runtime = "nodejs";

const CONTENT_TYPES: Record<string, string> = {
    ".avif": "image/avif",
    ".gif": "image/gif",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
};

interface RouteParams {
    params: Promise<{ segments: string[] }>;
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

export async function GET(_request: NextRequest, { params }: RouteParams) {
    try {
        const { segments } = await params;
        const filePath = resolveUploadFilePath(segments);

        if (!filePath) {
            return NextResponse.json({ success: false, message: "File not found" }, { status: 404 });
        }

        const fileBuffer = await readFile(filePath);
        const extension = path.extname(filePath).toLowerCase();
        const contentType = CONTENT_TYPES[extension] ?? "application/octet-stream";

        return new NextResponse(new Uint8Array(fileBuffer), {
            status: 200,
            headers: {
                "Cache-Control": "public, max-age=31536000, immutable",
                "Content-Length": String(fileBuffer.byteLength),
                "Content-Type": contentType,
            },
        });
    } catch (error) {
        console.error("[UPLOADS_GET]", error);
        return NextResponse.json({ success: false, message: "Failed to read file" }, { status: 500 });
    }
}
