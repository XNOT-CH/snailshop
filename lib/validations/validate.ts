import { z } from "zod";
import { validateJsonBody } from "@/lib/api";
import type { NextResponse } from "next/server";

/**
 * validateBody — parse + validate request body ผ่าน Zod schema
 *
 * Usage:
 *   const result = await validateBody(req, mySchema);
 *   if ("error" in result) return result.error;
 *   const data = result.data; // typed ✅
 */
export async function validateBody<T extends z.ZodTypeAny>(
    req: Request,
    schema: T
): Promise<{ data: z.infer<T> } | { error: NextResponse }> {
    return validateJsonBody(req, schema, {
        invalidJsonMessage: "Request body ไม่ถูกต้อง (invalid JSON)",
        invalidJsonStatus: 400,
        validationMessage: (error) => error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง",
        validationStatus: 400,
        errorPathMode: "first",
    });
}
