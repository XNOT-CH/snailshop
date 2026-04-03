let csrfTokenPromise: Promise<string> | null = null;

async function requestCsrfToken() {
    const response = await fetch("/api/csrf", {
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
        const message = typeof data?.message === "string" ? data.message : "";

        if (message !== "Invalid CSRF token" && message !== "Missing CSRF token") {
            return response;
        }
    } catch {
        return response;
    }

    csrfTokenPromise = null;
    response = await performRequest(true);
    return response;
}
