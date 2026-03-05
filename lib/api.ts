import { NextResponse } from "next/server";
import type { ZodSchema, ZodError } from "zod";

// ── Shared API Response Types ────────────────────────────

/** Successful API response */
export type ApiSuccess<T = unknown> = {
    success: true;
    data: T;
    message?: string;
};

/** Failed API response */
export type ApiError = {
    success: false;
    message: string;
    errors?: Record<string, string[]>;
};

/** Union type for all API responses */
export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// ── Response Helpers ─────────────────────────────────────

/** Return a success JSON response */
export function apiSuccess<T>(data: T, message?: string, status = 200) {
    return NextResponse.json<ApiSuccess<T>>(
        { success: true, data, ...(message ? { message } : {}) },
        { status }
    );
}

/** Return an error JSON response */
export function apiError(message: string, status = 400, errors?: Record<string, string[]>) {
    return NextResponse.json<ApiError>(
        { success: false, message, ...(errors ? { errors } : {}) },
        { status }
    );
}

// ── Zod Validation Helper ────────────────────────────────

/** Format Zod errors into field → messages[] map */
function formatZodErrors(error: ZodError): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const issue of error.issues) {
        const path = issue.path.join(".") || "_root";
        if (!result[path]) result[path] = [];
        result[path].push(issue.message);
    }
    return result;
}

/**
 * Parse and validate a JSON request body against a Zod schema.
 * Returns `{ data }` on success or `{ error: NextResponse }` on failure.
 *
 * @example
 * const parsed = await parseBody(req, loginSchema);
 * if ("error" in parsed) return parsed.error;
 * const { username, password } = parsed.data;
 */
export async function parseBody<T>(
    req: Request,
    schema: ZodSchema<T>
): Promise<{ data: T } | { error: ReturnType<typeof NextResponse.json> }> {
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return { error: apiError("Invalid JSON body", 400) };
    }

    const result = schema.safeParse(body);
    if (!result.success) {
        return {
            error: apiError(
                "ข้อมูลไม่ถูกต้อง",
                422,
                formatZodErrors(result.error)
            ),
        };
    }

    return { data: result.data };
}
