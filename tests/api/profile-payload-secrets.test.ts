import { describe, it, expect, vi, beforeEach } from "vitest";

const { authMock, findFirstMock } = vi.hoisted(() => ({
    authMock: vi.fn(),
    findFirstMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/db", () => ({
    db: { query: { users: { findFirst: findFirstMock } } },
    users: { id: "id" },
}));
vi.mock("drizzle-orm", () => ({ eq: vi.fn() }));

import { omitClientHiddenUserFields } from "@/lib/sensitiveData";

const userRow = {
    id: "u1",
    username: "somebody",
    name: "Somebody",
    email: "somebody@example.com",
    phone: "0812345678",
    image: null,
    role: "USER",
    creditBalance: "100.00",
    pointBalance: 5,
    emailVerified: true,
    pinHash: "$2b$12$averyrealbcrypthashvalue",
    pinUpdatedAt: "2026-08-01 00:00:00",
    pinLockedUntil: null,
    firstName: null, lastName: null, firstNameEn: null, lastNameEn: null,
    taxFullName: null, taxPhone: null, taxAddress: null, taxProvince: null,
    taxDistrict: null, taxSubdistrict: null, taxPostalCode: null,
    shipFullName: null, shipPhone: null, shipAddress: null, shipProvince: null,
    shipDistrict: null, shipSubdistrict: null, shipPostalCode: null,
    createdAt: "2026-01-01 00:00:00",
};

// A six-digit PIN behind bcrypt does not survive an offline search, and this PIN
// is what gates password changes and gacha spending. It must never leave the
// server, and a new column must not be able to reintroduce the leak.
describe("GET /api/profile — what reaches the browser", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authMock.mockResolvedValue({ user: { id: "u1" } });
        findFirstMock.mockResolvedValue(userRow);
    });

    it("never sends the PIN hash", async () => {
        const { GET } = await import("@/app/api/profile/route");

        const res = await GET();
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.data).not.toHaveProperty("pinHash");
        expect(body.data).not.toHaveProperty("password");
        expect(JSON.stringify(body)).not.toContain("$2b$12$");
    });

    it("still tells the page whether a PIN exists", async () => {
        const { GET } = await import("@/app/api/profile/route");

        const body = await (await GET()).json();

        expect(body.data.hasPin).toBe(true);
        expect(body.data.username).toBe("somebody");
    });

    it("reports no PIN for an account that has not set one", async () => {
        findFirstMock.mockResolvedValue({ ...userRow, pinHash: null });
        const { GET } = await import("@/app/api/profile/route");

        const body = await (await GET()).json();

        expect(body.data.hasPin).toBe(false);
        expect(body.data).not.toHaveProperty("pinHash");
    });
});

describe("omitClientHiddenUserFields", () => {
    it("drops the never-send fields and keeps the rest", () => {
        const safe = omitClientHiddenUserFields({
            id: "u1",
            username: "somebody",
            password: "$2b$12$hash",
            pinHash: "$2b$12$pin",
        });

        expect(safe).toEqual({ id: "u1", username: "somebody" });
    });
});
