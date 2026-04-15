import { NextResponse } from "next/server";
import { auth } from "@/auth";

const DEPRECATED_MESSAGE = "Legacy session endpoint is disabled. Use NextAuth session APIs instead.";

export async function GET() {
    const session = await auth();

    return NextResponse.json({
        authenticated: Boolean(session?.user?.id),
        user: session?.user
            ? {
                  id: session.user.id,
                  name: session.user.name ?? null,
                  email: session.user.email ?? null,
              }
            : null,
    });
}

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
