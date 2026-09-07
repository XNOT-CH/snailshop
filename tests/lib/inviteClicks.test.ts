import { describe, it, expect, vi, beforeEach } from "vitest";

// A click counter an outsider can inflate is worth nothing to someone paying
// per channel. These tests pin the three things that keep it honest: link
// unfurlers are ignored, the same visitor counts once a day, and a failure here
// never reaches the shopper.

const { onDuplicateKeyUpdate, values, insert, incr, expire } = vi.hoisted(() => {
    const onDuplicateKeyUpdate = vi.fn();
    const values = vi.fn(() => ({ onDuplicateKeyUpdate }));
    const insert = vi.fn(() => ({ values }));
    return { onDuplicateKeyUpdate, values, insert, incr: vi.fn(), expire: vi.fn() };
});

vi.mock("@/lib/db", () => ({
    db: { insert },
    inviteClicksDaily: { clicks: "clicks" },
}));

vi.mock("drizzle-orm", () => ({ sql: (strings: TemplateStringsArray) => strings.join("") }));

vi.mock("@/lib/redis", () => ({
    redis: { incr: (...args: unknown[]) => incr(...args), expire: (...args: unknown[]) => expire(...args) },
    isRedisAvailable: () => true,
}));

vi.mock("@/lib/rateLimit", () => ({ getClientIp: () => "203.0.113.7" }));
vi.mock("@/lib/utils/date", () => ({ formatDateInTimeZone: () => "2026-09-07" }));

import { recordInviteClick } from "@/lib/features/invites/inviteClicks";

function requestFrom(userAgent: string) {
    return new Request("http://localhost/r/TIKTOK1", { headers: { "user-agent": userAgent } });
}

const BROWSER_UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";

describe("recordInviteClick", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        incr.mockResolvedValue(1);
    });

    it("counts a first visit and sets the dedupe key to expire", async () => {
        await recordInviteClick("invite-1", requestFrom(BROWSER_UA));

        expect(incr).toHaveBeenCalledTimes(1);
        expect(expire).toHaveBeenCalledTimes(1);
        expect(insert).toHaveBeenCalledTimes(1);
        expect(values).toHaveBeenCalledWith(
            expect.objectContaining({ inviteCodeId: "invite-1", clickDate: "2026-09-07", clicks: 1 }),
        );
    });

    it("does not count the same visitor twice in one day", async () => {
        incr.mockResolvedValue(2);

        await recordInviteClick("invite-1", requestFrom(BROWSER_UA));

        expect(insert).not.toHaveBeenCalled();
    });

    it("namespaces the dedupe key so dev cannot suppress a production click", async () => {
        await recordInviteClick("invite-1", requestFrom(BROWSER_UA));

        const key = incr.mock.calls[0][0] as string;
        expect(key.startsWith("dev:") || key.startsWith("prod:")).toBe(true);
        expect(key).toContain("invite:click:invite-1:2026-09-07:");
        // The visitor is a hash, not an address.
        expect(key).not.toContain("203.0.113.7");
    });

    it.each([
        ["facebookexternalhit/1.1", "Facebook link preview"],
        ["Line-Bot", "LINE unfurl"],
        ["Mozilla/5.0 (compatible; Googlebot/2.1)", "search crawler"],
        ["curl/8.4.0", "command-line fetch"],
        ["", "no user agent at all"],
    ])("ignores %s (%s)", async (userAgent) => {
        await recordInviteClick("invite-1", requestFrom(userAgent));

        expect(incr).not.toHaveBeenCalled();
        expect(insert).not.toHaveBeenCalled();
    });

    it("swallows a database failure — analytics must never break the redirect", async () => {
        onDuplicateKeyUpdate.mockRejectedValueOnce(new Error("table is gone"));

        await expect(recordInviteClick("invite-1", requestFrom(BROWSER_UA))).resolves.toBeUndefined();
    });
});
