import { NextResponse } from "next/server";

export function contentApiError(error: string, init?: ResponseInit): NextResponse<{ error: string }> {
    return NextResponse.json({ error }, init);
}
