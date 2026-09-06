import { beforeEach, describe, expect, it, vi } from "vitest";

describe("lib/csrf-client", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.unstubAllGlobals();
    });

    it("adds a CSRF header to non-GET requests", async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ csrfToken: "csrf-1" }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                })
            )
            .mockResolvedValueOnce(new Response(null, { status: 200 }));

        vi.stubGlobal("fetch", fetchMock);

        const { fetchWithCsrf } = await import("@/lib/csrf-client");
        const response = await fetchWithCsrf("/api/admin/chat/conversations/c1", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isPinned: true }),
        });

        expect(response.status).toBe(200);
        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            "/api/admin/chat/conversations/c1",
            expect.objectContaining({
                method: "PATCH",
                headers: expect.any(Headers),
            })
        );
        const requestHeaders = fetchMock.mock.calls[1]?.[1]?.headers as Headers;
        expect(requestHeaders.get("X-CSRF-Token")).toBe("csrf-1");
    });

    it("refreshes the token and retries once when CSRF validation fails", async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ csrfToken: "stale-token" }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                })
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ message: "Invalid CSRF token" }), {
                    status: 401,
                    headers: { "Content-Type": "application/json" },
                })
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ csrfToken: "fresh-token" }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                })
            )
            .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));

        vi.stubGlobal("fetch", fetchMock);

        const { fetchWithCsrf } = await import("@/lib/csrf-client");
        const response = await fetchWithCsrf("/api/admin/chat/conversations/c1", {
            method: "PATCH",
            body: JSON.stringify({ tags: ["ด่วน"] }),
        });

        expect(response.status).toBe(200);
        expect(fetchMock).toHaveBeenCalledTimes(4);
        const firstAttemptHeaders = fetchMock.mock.calls[1]?.[1]?.headers as Headers;
        const retryHeaders = fetchMock.mock.calls[3]?.[1]?.headers as Headers;
        expect(firstAttemptHeaders.get("X-CSRF-Token")).toBe("stale-token");
        expect(retryHeaders.get("X-CSRF-Token")).toBe("fresh-token");
    });

    it("also retries when the reason arrives as { error }, not { message }", async () => {
        // contentApiError answers { error }. Reading only { message } left the
        // admin routes that use it without a retry at all.
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ csrfToken: "stale-token" }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                })
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ error: "Invalid CSRF token" }), {
                    status: 401,
                    headers: { "Content-Type": "application/json" },
                })
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ csrfToken: "fresh-token" }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                })
            )
            .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));

        vi.stubGlobal("fetch", fetchMock);

        const { fetchWithCsrf } = await import("@/lib/csrf-client");
        const response = await fetchWithCsrf("/api/admin/registration-policies/p1", {
            method: "DELETE",
        });

        expect(response.status).toBe(200);
        expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    it("does not retry a 401 that is a real permission denial", async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ csrfToken: "token" }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                })
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ error: "ไม่มีสิทธิ์เข้าถึง" }), {
                    status: 401,
                    headers: { "Content-Type": "application/json" },
                })
            );

        vi.stubGlobal("fetch", fetchMock);

        const { fetchWithCsrf } = await import("@/lib/csrf-client");
        const response = await fetchWithCsrf("/api/admin/registration-policies/p1", {
            method: "DELETE",
        });

        expect(response.status).toBe(401);
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
});
