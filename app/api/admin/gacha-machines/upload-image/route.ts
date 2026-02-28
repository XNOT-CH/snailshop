import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

export async function POST(request: NextRequest) {
    const authCheck = await isAdmin();
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ success: false, message: "ไม่พบไฟล์ที่อัปโหลด" }, { status: 400 });
        }

        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { success: false, message: "รองรับเฉพาะไฟล์ JPEG, PNG, WebP และ GIF" },
                { status: 400 }
            );
        }

        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            return NextResponse.json({ success: false, message: "ไฟล์ใหญ่เกิน 5MB" }, { status: 400 });
        }

        const uploadDir = path.join(process.cwd(), "public", "uploads", "gacha-machines");
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const extension = file.name.split(".").pop() || "jpg";
        const filename = `${timestamp}-${randomStr}.${extension}`;

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(path.join(uploadDir, filename), buffer);

        const publicUrl = `/uploads/gacha-machines/${filename}`;
        return NextResponse.json({ success: true, url: publicUrl, filename });
    } catch (error) {
        console.error("Gacha machine upload error:", error);
        return NextResponse.json({ success: false, message: "อัปโหลดไม่สำเร็จ" }, { status: 500 });
    }
}
