import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { saveOptimizedImageUpload } from "@/lib/serverImageUpload";
import path from "node:path";

export async function POST(request: NextRequest) {
    // Check if user is admin
    const authCheck = await isAdmin();
    if (!authCheck.success) {
        return NextResponse.json(
            { success: false, message: authCheck.error },
            { status: 401 }
        );
    }

    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json(
                { success: false, message: "No file uploaded" },
                { status: 400 }
            );
        }

        const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
        const savedFile = await saveOptimizedImageUpload(file, {
            allowedTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
            maxInputBytes: 5 * 1024 * 1024,
            maxDimension: 1080,
            outputQuality: 82,
            uploadDir,
            publicPath: "/uploads/products",
        });

        return NextResponse.json({
            success: true,
            url: savedFile.url,
            filename: savedFile.filename,
        });
    } catch (error) {
        console.error("Upload error:", error);
        const message = error instanceof Error ? error.message : "Failed to upload file";
        return NextResponse.json(
            { success: false, message },
            { status: /file|image/i.test(message) ? 400 : 500 }
        );
    }
}
