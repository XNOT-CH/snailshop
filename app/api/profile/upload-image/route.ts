import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { isAuthenticatedWithCsrf } from "@/lib/auth";
import { deleteManagedUpload, saveOptimizedImageUpload } from "@/lib/serverImageUpload";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
const PROFILE_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "profiles");
const PROFILE_PUBLIC_PATH = "/uploads/profiles";

export async function POST(request: NextRequest) {
    const authCheck = await isAuthenticatedWithCsrf(request);

    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            return NextResponse.json({ success: false, message: "กรุณาเลือกไฟล์รูปโปรไฟล์" }, { status: 400 });
        }

        const currentUser = await db.query.users.findFirst({
            where: eq(users.id, authCheck.userId),
            columns: { image: true },
        });

        const savedFile = await saveOptimizedImageUpload(file, {
            allowedTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
            maxInputBytes: 5 * 1024 * 1024,
            maxDimension: 512,
            outputQuality: 82,
            preserveAnimation: true,
            uploadDir: PROFILE_UPLOAD_DIR,
            publicPath: PROFILE_PUBLIC_PATH,
        });

        await db.update(users)
            .set({ image: savedFile.url })
            .where(eq(users.id, authCheck.userId));

        await deleteManagedUpload(currentUser?.image, PROFILE_UPLOAD_DIR, PROFILE_PUBLIC_PATH);

        return NextResponse.json({ success: true, url: savedFile.url, filename: savedFile.filename }, { status: 201 });
    } catch (error) {
        console.error("Profile image upload error:", error);
        const message = error instanceof Error ? error.message : "Failed to upload profile image";
        return NextResponse.json(
            { success: false, message },
            { status: /file|image/i.test(message) ? 400 : 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    const authCheck = await isAuthenticatedWithCsrf(request);

    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "Unauthorized" }, { status: 401 });
    }

    try {
        const currentUser = await db.query.users.findFirst({
            where: eq(users.id, authCheck.userId),
            columns: { image: true },
        });

        await db.update(users)
            .set({ image: null })
            .where(eq(users.id, authCheck.userId));

        await deleteManagedUpload(currentUser?.image, PROFILE_UPLOAD_DIR, PROFILE_PUBLIC_PATH);

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error("Profile image delete error:", error);
        return NextResponse.json({ success: false, message: "Failed to clear profile image" }, { status: 500 });
    }
}
