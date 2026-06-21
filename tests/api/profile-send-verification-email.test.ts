import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
    isAuthenticatedWithCsrf: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
    db: {
        query: {
            users: {
                findFirst: vi.fn(),
            },
        },
    },
    users: {
        id: "id",
    },
}));

vi.mock("@/lib/emailVerification", () => ({
    createEmailVerificationToken: vi.fn(),
}));

vi.mock("@/lib/getSiteSettings", () => ({
    getSiteSettings: vi.fn(),
}));

vi.mock("@/lib/mail", () => ({
    sendEmail: vi.fn(),
}));

vi.mock("@/lib/rateLimit", () => ({
    checkEmailVerificationRequestRateLimitShared: vi.fn(async () => ({ blocked: false })),
    getClientIp: vi.fn(() => "198.51.100.24"),
}));

vi.mock("@/lib/seo", () => ({
    resolveSiteName: vi.fn(() => "Game Store"),
}));

vi.mock("@/components/emails/EmailVerificationEmail", () => ({
    EmailVerificationEmail: vi.fn(() => null),
}));

vi.mock("drizzle-orm", () => ({
    eq: vi.fn(),
}));

import { isAuthenticatedWithCsrf } from "@/lib/auth";
import { db } from "@/lib/db";
import { createEmailVerificationToken } from "@/lib/emailVerification";
import { sendEmail } from "@/lib/mail";
import { checkEmailVerificationRequestRateLimitShared } from "@/lib/rateLimit";

function createRequest() {
    return new NextRequest("http://localhost/api/profile/send-verification-email", {
        method: "POST",
    });
}

describe("API: /api/profile/send-verification-email", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (isAuthenticatedWithCsrf as any).mockResolvedValue({ success: true, userId: "u1" });
    });

    it("rejects requests that fail CSRF-backed authentication before sending email", async () => {
        (isAuthenticatedWithCsrf as any).mockResolvedValueOnce({
            success: false,
            error: "Invalid CSRF token",
        });

        const { POST } = await import("@/app/api/profile/send-verification-email/route");
        const response = await POST(createRequest());
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body).toEqual({ success: false, message: "Invalid CSRF token" });
        expect(checkEmailVerificationRequestRateLimitShared).not.toHaveBeenCalled();
        expect(db.query.users.findFirst).not.toHaveBeenCalled();
        expect(createEmailVerificationToken).not.toHaveBeenCalled();
        expect(sendEmail).not.toHaveBeenCalled();
    });
});
