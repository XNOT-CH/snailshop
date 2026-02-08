import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

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

        // Validate file type
        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { success: false, message: "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed." },
                { status: 400 }
            );
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            return NextResponse.json(
                { success: false, message: "File size exceeds 5MB limit" },
                { status: 400 }
            );
        }

        // Create upload directory if it doesn't exist
        const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const extension = file.name.split(".").pop() || "jpg";
        const filename = `${timestamp}-${randomStr}.${extension}`;

        // Write file to disk
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filePath = path.join(uploadDir, filename);
        await writeFile(filePath, buffer);

        // Return the public URL
        const publicUrl = `/uploads/products/${filename}`;

        return NextResponse.json({
            success: true,
            url: publicUrl,
            filename,
        });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json(
            { success: false, message: "Failed to upload file" },
            { status: 500 }
        );
    }
}
