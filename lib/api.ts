import { NextResponse } from "next/server";
import { z } from "zod";

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
    errorCode?: string;
    timestamp?: string;
};

/** Union type for all API responses */
export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

export type ApiValidationErrors = Record<string, string[]>;

interface ApiSuccessPayloadOptions {
    message?: string;
    timestamp?: boolean | string;
}

interface ApiErrorPayloadOptions {
    errors?: ApiValidationErrors;
    errorCode?: string;
    timestamp?: boolean | string;
}

interface ParseJsonBodyOptions {
    invalidJsonMessage?: string;
    invalidJsonStatus?: number;
}

interface ValidateJsonBodyOptions extends ParseJsonBodyOptions {
    validationMessage?: string | ((error: z.ZodError) => string);
    validationStatus?: number;
    errorPathMode?: "full" | "first";
}

function getTimestamp(timestamp?: boolean | string) {
    if (timestamp === true) return new Date().toISOString();
    if (typeof timestamp === "string") return timestamp;
    return undefined;
}

export function createApiSuccessPayload<T>(
    data: T,
    options: ApiSuccessPayloadOptions = {}
): ApiSuccess<T> & { timestamp?: string } {
    const timestamp = getTimestamp(options.timestamp);
    return {
        success: true,
        data,
        ...(options.message ? { message: options.message } : {}),
        ...(timestamp ? { timestamp } : {}),
    };
}

export function createApiErrorPayload(
    message: string,
    options: ApiErrorPayloadOptions = {}
): ApiError {
    const timestamp = getTimestamp(options.timestamp);
    return {
        success: false,
        message,
        ...(options.errors ? { errors: options.errors } : {}),
        ...(options.errorCode ? { errorCode: options.errorCode } : {}),
        ...(timestamp ? { timestamp } : {}),
    };
}

// ── Response Helpers ─────────────────────────────────────

/** Return a success JSON response */
export function apiSuccess<T>(data: T, message?: string, status = 200) {
    return NextResponse.json<ApiSuccess<T>>(
        createApiSuccessPayload(data, { message }),
        { status }
    );
}

/** Return an error JSON response */
export function apiError(message: string, status = 400, errors?: Record<string, string[]>) {
    return NextResponse.json<ApiError>(
        createApiErrorPayload(message, { errors }),
        { status }
    );
}

// ── Zod Validation Helper ────────────────────────────────

/** Format Zod errors into field → messages[] map */
export function formatZodErrors(
    error: z.ZodError,
    options: { pathMode?: "full" | "first" } = {}
): ApiValidationErrors {
    const result: Record<string, string[]> = {};
    for (const issue of error.issues) {
        const path = options.pathMode === "first"
            ? String(issue.path[0] || "_root")
            : issue.path.join(".") || "_root";
        if (!result[path]) result[path] = [];
        result[path].push(issue.message);
    }
    return result;
}

export async function parseJsonBody(
    req: Request,
    options: ParseJsonBodyOptions = {}
): Promise<{ data: unknown } | { error: ReturnType<typeof NextResponse.json> }> {
    try {
        return { data: await req.json() };
    } catch {
        return {
            error: apiError(
                options.invalidJsonMessage ?? "Invalid JSON body",
                options.invalidJsonStatus ?? 400
            ),
        };
    }
}

export async function validateJsonBody<T extends z.ZodTypeAny>(
    req: Request,
    schema: T,
    options: ValidateJsonBodyOptions = {}
): Promise<{ data: z.infer<T> } | { error: ReturnType<typeof NextResponse.json> }> {
    const parsed = await parseJsonBody(req, options);
    if ("error" in parsed) return parsed;

    const result = schema.safeParse(parsed.data);
    if (!result.success) {
        const message = typeof options.validationMessage === "function"
            ? options.validationMessage(result.error)
            : options.validationMessage ?? "ข้อมูลไม่ถูกต้อง";

        return {
            error: apiError(
                message,
                options.validationStatus ?? 422,
                formatZodErrors(result.error, { pathMode: options.errorPathMode })
            ),
        };
    }

    return { data: result.data as z.infer<T> };
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
export async function parseBody<T extends z.ZodTypeAny>(
    req: Request,
    schema: T
): Promise<{ data: z.infer<T> } | { error: ReturnType<typeof NextResponse.json> }> {
    return validateJsonBody(req, schema, {
        invalidJsonMessage: "Invalid JSON body",
        invalidJsonStatus: 400,
        validationMessage: "ข้อมูลไม่ถูกต้อง",
        validationStatus: 422,
        errorPathMode: "full",
    });
}
