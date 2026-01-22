import { NextResponse } from "next/server";

/**
 * Standardized API Response Helper
 * Ensures consistent response format across all APIs
 */

// Standard success response
export function apiSuccess<T>(data: T, message?: string, statusCode: number = 200) {
    return NextResponse.json(
        {
            success: true,
            message: message || "Success",
            data,
            timestamp: new Date().toISOString(),
        },
        { status: statusCode }
    );
}

// Standard error response (safe - doesn't expose internals)
export function apiError(
    message: string,
    statusCode: number = 400,
    errorCode?: string
) {
    return NextResponse.json(
        {
            success: false,
            message,
            errorCode: errorCode || `ERR_${statusCode}`,
            timestamp: new Date().toISOString(),
        },
        { status: statusCode }
    );
}

// Common error responses
export const API_ERRORS = {
    UNAUTHORIZED: () => apiError("ไม่ได้เข้าสู่ระบบ", 401, "UNAUTHORIZED"),
    FORBIDDEN: () => apiError("ไม่มีสิทธิ์เข้าถึง", 403, "FORBIDDEN"),
    NOT_FOUND: (resource?: string) =>
        apiError(`ไม่พบ${resource || "ข้อมูล"}`, 404, "NOT_FOUND"),
    BAD_REQUEST: (message?: string) =>
        apiError(message || "ข้อมูลไม่ถูกต้อง", 400, "BAD_REQUEST"),
    RATE_LIMITED: (retryAfter?: number) => {
        const response = apiError("ส่งคำขอมากเกินไป กรุณารอสักครู่", 429, "RATE_LIMITED");
        if (retryAfter) {
            response.headers.set("Retry-After", String(Math.ceil(retryAfter / 1000)));
        }
        return response;
    },
    INTERNAL_ERROR: () =>
        apiError("เกิดข้อผิดพลาดภายในระบบ", 500, "INTERNAL_ERROR"),
    VALIDATION_ERROR: (field: string, message: string) =>
        apiError(`${field}: ${message}`, 422, "VALIDATION_ERROR"),
    CSRF_ERROR: () =>
        apiError("CSRF token ไม่ถูกต้อง", 403, "CSRF_ERROR"),
};

/**
 * Safe error handler - logs full error but returns safe message
 */
export function handleApiError(error: unknown, context?: string): NextResponse {
    // Log the full error for debugging
    console.error(`API Error${context ? ` [${context}]` : ""}:`, error);

    // Return safe error to client
    return API_ERRORS.INTERNAL_ERROR();
}

/**
 * Input Validation Helpers
 */

// Check if value is a non-empty string
export function isValidString(value: unknown, minLength: number = 1): boolean {
    return typeof value === "string" && value.trim().length >= minLength;
}

// Check if value is a positive number
export function isValidNumber(value: unknown, min: number = 0): boolean {
    const num = Number(value);
    return !isNaN(num) && num >= min;
}

// Check if value is a valid email
export function isValidEmail(value: unknown): boolean {
    if (typeof value !== "string") return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
}

// Check if value is a valid UUID
export function isValidUuid(value: unknown): boolean {
    if (typeof value !== "string") return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
}

// Validate required fields in an object
export function validateRequired(
    obj: Record<string, unknown>,
    fields: string[]
): { valid: boolean; missing: string[] } {
    const missing = fields.filter(
        field => obj[field] === undefined || obj[field] === null || obj[field] === ""
    );
    return { valid: missing.length === 0, missing };
}

/**
 * Request body parser with error handling
 */
export async function parseRequestBody<T = Record<string, unknown>>(
    request: Request
): Promise<{ success: true; data: T } | { success: false; error: NextResponse }> {
    try {
        const body = await request.json();
        return { success: true, data: body as T };
    } catch {
        return {
            success: false,
            error: API_ERRORS.BAD_REQUEST("Invalid JSON body"),
        };
    }
}

/**
 * Validate and parse request body with required fields
 */
export async function validateRequestBody<T extends Record<string, unknown>>(
    request: Request,
    requiredFields: string[]
): Promise<{ success: true; data: T } | { success: false; error: NextResponse }> {
    const parseResult = await parseRequestBody<T>(request);

    if (!parseResult.success) {
        return parseResult;
    }

    const validation = validateRequired(parseResult.data, requiredFields);

    if (!validation.valid) {
        return {
            success: false,
            error: API_ERRORS.BAD_REQUEST(
                `กรุณากรอกข้อมูลให้ครบ: ${validation.missing.join(", ")}`
            ),
        };
    }

    return parseResult;
}
