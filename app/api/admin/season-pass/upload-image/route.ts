import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { isAdmin } from "@/lib/auth";
import { saveOptimizedImageUpload } from "@/lib/serverImageUpload";

export async function POST(request: NextRequest) {
    const authCheck = await isAdmin();
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ success: false, message: "ไม่พบไฟล์รูปที่อัปโหลด" }, { status: 400 });
        }

        const savedFile = await saveOptimizedImageUpload(file, {
            allowedTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
            maxInputBytes: 5 * 1024 * 1024,
            maxDimension: 1080,
            outputQuality: 82,
            uploadDir: path.join(process.cwd(), "public", "uploads", "season-pass"),
            publicPath: "/uploads/season-pass",
        });

        return NextResponse.json({ success: true, url: savedFile.url, filename: savedFile.filename });
    } catch (error) {
        console.error("Season Pass reward upload error:", error);
        const message = error instanceof Error ? error.message : "อัปโหลดรูปไม่สำเร็จ";
        return NextResponse.json({ success: false, message }, { status: /file|image/i.test(message) ? 400 : 500 });
    }
}
