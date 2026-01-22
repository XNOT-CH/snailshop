/**
 * Sanitize user input to prevent XSS attacks
 * Removes or escapes potentially dangerous HTML/JavaScript content
 */

// Characters that could be used in XSS attacks
const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,  // Script tags
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,  // Iframe tags
    /javascript:/gi,                                         // JavaScript protocol
    /on\w+\s*=/gi,                                           // Event handlers (onclick, onerror, etc.)
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,  // Object tags
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,     // Embed tags
    /<link\b[^>]*>/gi,                                       // Link tags
    /<meta\b[^>]*>/gi,                                       // Meta tags
    /data:/gi,                                               // Data URIs
    /vbscript:/gi,                                           // VBScript protocol
];

/**
 * Sanitize a string by removing dangerous patterns
 */
export function sanitize(input: string): string {
    if (!input || typeof input !== "string") return "";

    let sanitized = input;

    // Remove dangerous patterns
    for (const pattern of dangerousPatterns) {
        sanitized = sanitized.replace(pattern, "");
    }

    return sanitized.trim();
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(input: string): string {
    if (!input || typeof input !== "string") return "";

    const htmlEntities: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#x27;",
        "/": "&#x2F;",
        "`": "&#x60;",
        "=": "&#x3D;",
    };

    return input.replace(/[&<>"'`=/]/g, (char) => htmlEntities[char] || char);
}

/**
 * Sanitize object - applies sanitize to all string values
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
    const sanitized = { ...obj };

    for (const key in sanitized) {
        if (typeof sanitized[key] === "string") {
            (sanitized as Record<string, unknown>)[key] = sanitize(sanitized[key] as string);
        }
    }

    return sanitized;
}

/**
 * Validate URL to prevent javascript: and data: URLs
 */
export function isValidUrl(url: string): boolean {
    if (!url || typeof url !== "string") return false;

    try {
        const parsed = new URL(url);
        // Only allow http and https protocols
        return ["http:", "https:"].includes(parsed.protocol);
    } catch {
        return false;
    }
}

/**
 * Sanitize URL - returns empty string if invalid
 */
export function sanitizeUrl(url: string): string {
    if (!url) return "";

    // Remove any dangerous protocols
    const sanitized = url
        .replace(/javascript:/gi, "")
        .replace(/data:/gi, "")
        .replace(/vbscript:/gi, "")
        .trim();

    // Validate the URL
    if (!isValidUrl(sanitized)) {
        // If not a valid URL, return empty
        return "";
    }

    return sanitized;
}
