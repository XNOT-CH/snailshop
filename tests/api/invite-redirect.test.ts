import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// The public half of an invite link: /r/<code>. A shopper must always land in
// the shop, whatever the code turns out to be.

vi.mock("@/lib/features/invites/queries", () => ({
    findActiveInviteByCode: vi.fn(),
}));

// cacheOrFetch is a pass-through here so the tests exercise the lookup itself.
vi.mock("@/lib/cache", () => ({
    CACHE_TTL: { SHORT: 300 },
    cacheOrFetch: vi.fn(async (_key: string, fetchFn: () => Promise<unknown>) => fetchFn()),
}));

import { findActiveInviteByCode } from "@/lib/features/invites/queries";
import { INVITE_COOKIE } from "@/lib/features/invites/inviteCookie";

async function callRoute(code: string) {
    const { GET } = await import("@/app/r/[code]/route");
    const request = new NextRequest(`http://localhost/r/${code}`);
    return GET(request, { params: Promise.resolve({ code }) });
}

describe("GET /r/[code]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("redirects to the code's destination and remembers the code", async () => {
        vi.mocked(findActiveInviteByCode).mockResolvedValue({
            id: "invite-1",
            destination: "/shop",
        } as any);

        const res = await callRoute("TIKTOK1");

        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toBe("http://localhost/shop");
        expect(res.headers.get("cache-control")).toBe("no-store");

        const cookie = res.cookies.get(INVITE_COOKIE);
        expect(cookie?.value).toBe("TIKTOK1");
        expect(cookie?.httpOnly).toBe(true);
        expect(cookie?.sameSite).toBe("lax");
    });

    it("is a temporary redirect, so the link is never cached past the handler", async () => {
        vi.mocked(findActiveInviteByCode).mockResolvedValue({
            id: "invite-1",
            destination: "/shop",
        } as any);

        const res = await callRoute("TIKTOK1");

        // 301/308 would let a browser or CDN skip this route entirely, so the
        // visitor would never get the cookie.
        expect(res.status).not.toBe(301);
        expect(res.status).not.toBe(308);
    });

    it("sends an unknown code to the homepage without a cookie", async () => {
        vi.mocked(findActiveInviteByCode).mockResolvedValue(undefined as any);

        const res = await callRoute("NOPE99");

        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toBe("http://localhost/");
        expect(res.cookies.get(INVITE_COOKIE)).toBeUndefined();
    });

    it("never touches the database for a malformed code", async () => {
        const res = await callRoute("a");

        expect(res.status).toBe(307);
        expect(findActiveInviteByCode).not.toHaveBeenCalled();
        expect(res.cookies.get(INVITE_COOKIE)).toBeUndefined();
    });

    it("accepts a lowercase code and stores it uppercased", async () => {
        vi.mocked(findActiveInviteByCode).mockResolvedValue({
            id: "invite-1",
            destination: "/shop",
        } as any);

        const res = await callRoute("tiktok1");

        expect(findActiveInviteByCode).toHaveBeenCalledWith("TIKTOK1");
        expect(res.cookies.get(INVITE_COOKIE)?.value).toBe("TIKTOK1");
    });
});
