import { NextResponse } from "next/server";
import { LEGACY_LOGIN_DEPRECATED_MESSAGE } from "@/lib/login";

export async function POST() {
    return NextResponse.json(
        {
            success: false,
            message: LEGACY_LOGIN_DEPRECATED_MESSAGE,
        },
        { status: 410 }
    );
}
