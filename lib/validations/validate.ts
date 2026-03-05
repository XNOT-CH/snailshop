import { NextResponse } from "next/server";
import { ZodSchema, ZodError } from "zod";

/**
 * validateBody — parse + validate request body ผ่าน Zod schema
 *
 * Usage:
 *   const result = await validateBody(req, mySchema);
 *   if ("error" in result) return result.error;
 *   const data = result.data; // typed ✅
 */
export async function validateBody<T>(
    req: Request,
    schema: ZodSchema<T>
): Promise<{ data: T } | { error: NextResponse }> {
    let raw: unknown;
    try {
        raw = await req.json();
    } catch {
        return {
            error: NextResponse.json(
                { success: false, message: "Request body ไม่ถูกต้อง (invalid JSON)" },
                { status: 400 }
            ),
        };
    }

    const result = schema.safeParse(raw);
    if (!result.success) {
        const firstMessage = result.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
        return {
            error: NextResponse.json(
                {
                    success: false,
                    message: firstMessage,
                    errors: result.error.flatten().fieldErrors,
                },
                { status: 400 }
            ),
        };
    }

    return { data: result.data };
}
