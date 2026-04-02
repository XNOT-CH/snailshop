import { NextRequest, NextResponse } from "next/server";
import { cleanupExpiredChatImages } from "@/lib/chat";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");
    const cronSecret = process.env.CRON_SECRET;
    const isProduction = process.env.NODE_ENV === "production";

    if (isProduction && !cronSecret) {
        console.error("[CHAT_IMAGE_CLEANUP] Missing CRON_SECRET in production.");
        return NextResponse.json({ success: false, message: "Server misconfigured" }, { status: 500 });
    }

    if (cronSecret && secret !== cronSecret) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    try {
        const result = await cleanupExpiredChatImages();

        return NextResponse.json({
            success: true,
            deletedFiles: result.deletedFiles,
            message:
                result.deletedFiles > 0
                    ? `Deleted ${result.deletedFiles} expired chat image(s)`
                    : "No expired chat images found",
        });
    } catch (error) {
        console.error("[CHAT_IMAGE_CLEANUP]", error);
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : "Failed" },
            { status: 500 }
        );
    }
}
