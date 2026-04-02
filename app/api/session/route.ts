import { NextResponse } from "next/server";

const DEPRECATED_MESSAGE = "Legacy session endpoint is disabled. Use NextAuth session APIs instead.";

export async function POST() {
    return NextResponse.json(
        { success: false, message: DEPRECATED_MESSAGE },
        { status: 410 }
    );
}

export async function DELETE() {
    return NextResponse.json(
        { success: false, message: DEPRECATED_MESSAGE },
        { status: 410 }
    );
}
