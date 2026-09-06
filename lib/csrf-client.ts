import { API_ROUTES } from "@/lib/constants/apiRoutes";

let csrfTokenPromise: Promise<string> | null = null;

async function requestCsrfToken() {
    const response = await fetch(API_ROUTES.CSRF, {
        method: "GET",
        cache: "no-store",
    });
    const data = await response.json();

    if (!response.ok || typeof data?.csrfToken !== "string") {
        throw new Error(data?.message ?? "Failed to fetch CSRF token");
    }

    return data.csrfToken;
}

export async function getCsrfToken(forceRefresh = false) {
    if (!csrfTokenPromise || forceRefresh) {
        csrfTokenPromise = requestCsrfToken();
    }

    try {
        return await csrfTokenPromise;
    } catch (error) {
        csrfTokenPromise = null;
        throw error;
    }
}

export async function fetchWithCsrf(input: RequestInfo | URL, init: RequestInit = {}) {
    const method = (init.method ?? "GET").toUpperCase();

    if (method === "GET" || method === "HEAD") {
        return fetch(input, init);
    }

    async function performRequest(forceRefresh = false) {
        const token = await getCsrfToken(forceRefresh);
        const headers = new Headers(init.headers);
        headers.set("X-CSRF-Token", token);

        return fetch(input, {
            ...init,
            headers,
        });
    }

    let response = await performRequest();

    if (response.status !== 401) {
        return response;
    }

    const clonedResponse = response.clone();

    try {
        const data = await clonedResponse.json();
        // Routes answer in one of two shapes: { message } from the auth
        // helpers, { error } from contentApiError. Reading only `message`
        // meant a rotated token on a contentApiError route never retried and
        // the admin had to reload the page by hand.
        const reason = typeof data?.message === "string"
            ? data.message
            : typeof data?.error === "string" ? data.error : "";

        // Still gated on the CSRF wording alone: a real permission denial
        // answers something else and must surface, not be retried.
        if (reason !== "Invalid CSRF token" && reason !== "Missing CSRF token") {
            return response;
        }
    } catch {
        return response;
    }

    csrfTokenPromise = null;
    response = await performRequest(true);
    return response;
}
