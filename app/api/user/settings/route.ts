import { NextResponse } from "next/server";

const DEPRECATED_MESSAGE = "Legacy password settings endpoint is disabled.";

export async function PATCH() {
    return NextResponse.json(
        { success: false, message: DEPRECATED_MESSAGE },
        { status: 410 }
    );
}
