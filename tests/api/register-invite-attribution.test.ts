import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// The signup half of invite attribution. The rule these tests exist to hold is
// that registration outranks analytics: whatever the invite lookup does, a
// shopper still gets an account.

vi.mock("@/lib/db", () => ({
    db: {
        query: { users: { findFirst: vi.fn() } },
        insert: vi.fn().mockReturnValue({ values: vi.fn() }),
    },
    users: { username: "username", id: "id" },
}));

vi.mock("drizzle-orm", () => ({ eq: vi.fn(), or: vi.fn() }));

vi.mock("bcryptjs", () => ({
    default: { hash: vi.fn().mockResolvedValue("hashed_password") },
}));

vi.mock("@/lib/rateLimit", () => ({
    checkRegisterRateLimit: vi.fn().mockReturnValue({ blocked: false }),
    getClientIp: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/auditLog", () => ({
    auditFromRequest: vi.fn(),
    AUDIT_ACTIONS: { REGISTER: "REGISTER" },
}));

vi.mock("@/lib/api", () => ({ parseBody: vi.fn() }));
vi.mock("@/lib/validations", () => ({ registerSchema: {} }));
vi.mock("@/lib/utils/date", () => ({ mysqlNow: vi.fn(() => "2026-01-01 00:00:00") }));
vi.mock("@/lib/security/turnstile", () => ({
    verifyTurnstileToken: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("@/lib/getRegistrationPolicies", () => ({
    getRegistrationPolicies: vi.fn().mockResolvedValue({ tos: [], pp: [] }),
    hasRegistrationPolicies: () => false,
}));

vi.mock("@/lib/features/invites/queries", () => ({
    findActiveInviteByCode: vi.fn(),
}));

import { db } from "@/lib/db";
import { parseBody } from "@/lib/api";
import { findActiveInviteByCode } from "@/lib/features/invites/queries";
import { INVITE_COOKIE } from "@/lib/features/invites/inviteCookie";

function createRequest(cookie?: string) {
    const headers = new Headers();
    if (cookie) headers.set("cookie", `${INVITE_COOKIE}=${cookie}`);

    return new NextRequest("http://localhost/api/register", {
        method: "POST",
        headers,
        body: JSON.stringify({ username: "newuser", email: "new@example.com", password: "secure123" }),
    });
}

function insertedValues() {
    return (db.insert as any).mock.results[0]?.value?.values.mock.calls[0]?.[0];
}

describe("register: invite attribution", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (parseBody as any).mockResolvedValue({
            data: {
                username: "newuser",
                email: "new@example.com",
                password: "secure123",
                turnstileToken: "token-1",
            },
        });
        (db.query.users.findFirst as any).mockResolvedValue(null);
    });

    it("stamps the invite code from the cookie onto the new user", async () => {
        vi.mocked(findActiveInviteByCode).mockResolvedValue({ id: "invite-1" } as any);

        const { POST } = await import("@/app/api/register/route");
        const res = await POST(createRequest("TIKTOK1"));

        expect(res.status).toBe(200);
        expect(findActiveInviteByCode).toHaveBeenCalledWith("TIKTOK1");
        expect(insertedValues()).toEqual(expect.objectContaining({ inviteCodeId: "invite-1" }));
    });

    it("uppercases a lowercase cookie before looking it up", async () => {
        vi.mocked(findActiveInviteByCode).mockResolvedValue({ id: "invite-1" } as any);

        const { POST } = await import("@/app/api/register/route");
        await POST(createRequest("tiktok1"));

        expect(findActiveInviteByCode).toHaveBeenCalledWith("TIKTOK1");
    });

    it("records no attribution when there is no cookie", async () => {
        const { POST } = await import("@/app/api/register/route");
        const res = await POST(createRequest());

        expect(res.status).toBe(200);
        expect(findActiveInviteByCode).not.toHaveBeenCalled();
        expect(insertedValues()).toEqual(expect.objectContaining({ inviteCodeId: null }));
    });

    it("never queries for a malformed cookie value", async () => {
        const { POST } = await import("@/app/api/register/route");
        const res = await POST(createRequest("../../etc/passwd"));

        expect(res.status).toBe(200);
        expect(findActiveInviteByCode).not.toHaveBeenCalled();
        expect(insertedValues()).toEqual(expect.objectContaining({ inviteCodeId: null }));
    });

    it("records no attribution for a code that is switched off", async () => {
        // findActiveInviteByCode only matches active rows, so an inactive code
        // comes back as undefined.
        vi.mocked(findActiveInviteByCode).mockResolvedValue(undefined as any);

        const { POST } = await import("@/app/api/register/route");
        const res = await POST(createRequest("OLDCODE"));

        expect(res.status).toBe(200);
        expect(insertedValues()).toEqual(expect.objectContaining({ inviteCodeId: null }));
    });

    it("still registers the user when the invite lookup throws", async () => {
        vi.mocked(findActiveInviteByCode).mockRejectedValue(new Error("db is down"));

        const { POST } = await import("@/app/api/register/route");
        const res = await POST(createRequest("TIKTOK1"));

        expect(res.status).toBe(200);
        expect(insertedValues()).toEqual(expect.objectContaining({ inviteCodeId: null }));
    });

    it("clears the invite cookie once the signup succeeds", async () => {
        vi.mocked(findActiveInviteByCode).mockResolvedValue({ id: "invite-1" } as any);

        const { POST } = await import("@/app/api/register/route");
        const res = await POST(createRequest("TIKTOK1"));

        // Asserted on the header the browser actually receives: an empty value
        // with an immediate expiry is what clears it.
        const setCookie = res.headers.get("set-cookie") ?? "";
        expect(setCookie).toContain(`${INVITE_COOKIE}=;`);
        expect(setCookie).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);
    });

    it("keeps the cookie when the signup is rejected, so a retry stays attributed", async () => {
        (db.query.users.findFirst as any).mockResolvedValue({ id: "existing", username: "newuser" });

        const { POST } = await import("@/app/api/register/route");
        const res = await POST(createRequest("TIKTOK1"));

        expect(res.status).toBe(400);
        expect(res.cookies.get(INVITE_COOKIE)).toBeUndefined();
    });
});
