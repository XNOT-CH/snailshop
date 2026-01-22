"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Hook for managing CSRF token in forms
 */
export function useCsrfToken() {
    const [csrfToken, setCsrfToken] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);

    const fetchCsrfToken = useCallback(async () => {
        try {
            const res = await fetch("/api/csrf");
            const data = await res.json();
            if (data.success) {
                setCsrfToken(data.csrfToken);
            }
        } catch (error) {
            console.error("Failed to fetch CSRF token:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCsrfToken();
    }, [fetchCsrfToken]);

    // Refresh token (useful after form submission)
    const refreshToken = useCallback(async () => {
        setIsLoading(true);
        await fetchCsrfToken();
    }, [fetchCsrfToken]);

    return { csrfToken, isLoading, refreshToken };
}

/**
 * Get headers with CSRF token for fetch requests
 */
export function getCsrfHeaders(csrfToken: string): HeadersInit {
    return {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
    };
}
