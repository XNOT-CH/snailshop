import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    dbMock,
    getAdminSeasonPassRewardsMock,
    getOrCreateSeasonPassPlanMock,
    requirePermissionMock,
    updateAdminSeasonPassRewardsMock,
    updateSetMock,
} = vi.hoisted(() => {
    const updateWhereMock = vi.fn();
    const updateSetMock = vi.fn(() => ({ where: updateWhereMock }));

    return {
        dbMock: {
            update: vi.fn(() => ({ set: updateSetMock })),
            query: {
                seasonPassPlans: {
                    findFirst: vi.fn(),
                },
            },
        },
        getAdminSeasonPassRewardsMock: vi.fn(),
        getOrCreateSeasonPassPlanMock: vi.fn(),
        requirePermissionMock: vi.fn(),
        updateAdminSeasonPassRewardsMock: vi.fn(),
        updateSetMock,
    };
});

vi.mock("@/lib/auth", () => ({
    requirePermission: requirePermissionMock,
    requirePermissionWithCsrf: requirePermissionMock,
}));

vi.mock("@/lib/db", () => ({
    db: dbMock,
    seasonPassPlans: {
        id: "id",
    },
}));

vi.mock("drizzle-orm", () => ({
    eq: vi.fn(),
}));

vi.mock("@/lib/seasonPass", () => ({
    getAdminSeasonPassRewards: getAdminSeasonPassRewardsMock,
    getOrCreateSeasonPassPlan: getOrCreateSeasonPassPlanMock,
    updateAdminSeasonPassRewards: updateAdminSeasonPassRewardsMock,
}));

const ADMIN_OK = { success: true, userId: "admin-1" };
const UNAUTHORIZED = { success: false, error: "Unauthorized" };

const plan = {
    id: "plan-1",
    name: "Season Pass 30 วัน",
    description: "รับรางวัลรายวัน",
    price: "50.00",
    durationDays: 30,
    isActive: true,
};

const reward = {
    dayNumber: 1,
    rewardType: "credits",
    amount: "10",
    label: "เครดิต",
    imageUrl: null,
    highlight: false,
};

const request = (url: string, method = "GET", body?: unknown) =>
    new Request(url, {
        method,
        body: body === undefined ? undefined : JSON.stringify(body),
    });

describe("admin season-pass plan/rewards API response contracts", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
        requirePermissionMock.mockResolvedValue(ADMIN_OK);
        getOrCreateSeasonPassPlanMock.mockResolvedValue(plan);
        dbMock.query.seasonPassPlans.findFirst.mockResolvedValue(plan);
        getAdminSeasonPassRewardsMock.mockResolvedValue([reward]);
        updateAdminSeasonPassRewardsMock.mockResolvedValue([reward]);
    });

    it("preserves season-pass plan raw success and error contracts", async () => {
        const { GET } = await import("@/app/api/admin/season-pass/plan/route");

        const response = await GET();

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual(plan);

        vi.resetModules();
        requirePermissionMock.mockResolvedValueOnce(UNAUTHORIZED);
        const { GET: getUnauthorized } = await import("@/app/api/admin/season-pass/plan/route");
        const unauthorizedResponse = await getUnauthorized();

        expect(unauthorizedResponse.status).toBe(401);
        await expect(unauthorizedResponse.json()).resolves.toEqual({ error: "Unauthorized" });

        vi.resetModules();
        getOrCreateSeasonPassPlanMock.mockRejectedValueOnce(new Error("plan db offline"));
        const { GET: getWithError } = await import("@/app/api/admin/season-pass/plan/route");
        const errorResponse = await getWithError();

        expect(errorResponse.status).toBe(500);
        await expect(errorResponse.json()).resolves.toEqual({ error: "Failed to fetch season pass plan" });
    });

    it("preserves season-pass plan update validation and success contracts", async () => {
        const { PUT } = await import("@/app/api/admin/season-pass/plan/route");

        const missingNameResponse = await PUT(
            request("http://localhost/api/admin/season-pass/plan", "PUT", {
                name: " ",
                price: "50.00",
                durationDays: 30,
            }),
        );

        expect(missingNameResponse.status).toBe(400);
        await expect(missingNameResponse.json()).resolves.toEqual({ error: "Plan name is required" });

        const invalidPriceResponse = await PUT(
            request("http://localhost/api/admin/season-pass/plan", "PUT", {
                name: "Season Pass 30 วัน",
                price: "-1",
                durationDays: 30,
            }),
        );

        expect(invalidPriceResponse.status).toBe(400);
        await expect(invalidPriceResponse.json()).resolves.toEqual({ error: "Invalid price" });

        const invalidDurationResponse = await PUT(
            request("http://localhost/api/admin/season-pass/plan", "PUT", {
                name: "Season Pass 30 วัน",
                price: "50.00",
                durationDays: 60,
            }),
        );

        expect(invalidDurationResponse.status).toBe(400);
        await expect(invalidDurationResponse.json()).resolves.toEqual({
            error: "Season Pass currently supports a fixed 30-day reward board",
        });

        const successResponse = await PUT(
            request("http://localhost/api/admin/season-pass/plan", "PUT", {
                name: "Season Pass 30 วัน",
                description: "รับรางวัลรายวัน",
                price: "50.00",
                durationDays: 30,
                isActive: true,
            }),
        );

        expect(successResponse.status).toBe(200);
        await expect(successResponse.json()).resolves.toEqual(plan);
        expect(updateSetMock).toHaveBeenCalledWith(expect.objectContaining({ price: "50.00", durationDays: 30 }));
    });

    it("preserves season-pass rewards raw success and validation contracts", async () => {
        const { GET, PUT } = await import("@/app/api/admin/season-pass/rewards/route");

        const getResponse = await GET();

        expect(getResponse.status).toBe(200);
        await expect(getResponse.json()).resolves.toEqual([reward]);

        const missingPayloadResponse = await PUT(
            request("http://localhost/api/admin/season-pass/rewards", "PUT", {
                rewards: [],
            }),
        );

        expect(missingPayloadResponse.status).toBe(400);
        await expect(missingPayloadResponse.json()).resolves.toEqual({ error: "Rewards payload is required" });

        const invalidDayResponse = await PUT(
            request("http://localhost/api/admin/season-pass/rewards", "PUT", {
                rewards: [{ ...reward, dayNumber: 31 }],
            }),
        );

        expect(invalidDayResponse.status).toBe(400);
        await expect(invalidDayResponse.json()).resolves.toEqual({ error: "Invalid day number" });

        const invalidTypeResponse = await PUT(
            request("http://localhost/api/admin/season-pass/rewards", "PUT", {
                rewards: [{ ...reward, rewardType: "badge" }],
            }),
        );

        expect(invalidTypeResponse.status).toBe(400);
        await expect(invalidTypeResponse.json()).resolves.toEqual({ error: "Invalid reward type" });

        const missingLabelResponse = await PUT(
            request("http://localhost/api/admin/season-pass/rewards", "PUT", {
                rewards: [{ ...reward, label: "" }],
            }),
        );

        expect(missingLabelResponse.status).toBe(400);
        await expect(missingLabelResponse.json()).resolves.toEqual({ error: "Reward label and amount are required" });
    });

    it("preserves season-pass rewards update success and error contracts", async () => {
        const { GET, PUT } = await import("@/app/api/admin/season-pass/rewards/route");

        const updateResponse = await PUT(
            request("http://localhost/api/admin/season-pass/rewards", "PUT", {
                rewards: [reward],
            }),
        );

        expect(updateResponse.status).toBe(200);
        await expect(updateResponse.json()).resolves.toEqual([reward]);

        vi.resetModules();
        getAdminSeasonPassRewardsMock.mockRejectedValueOnce(new Error("rewards db offline"));
        const { GET: getWithError } = await import("@/app/api/admin/season-pass/rewards/route");
        const getErrorResponse = await getWithError();

        expect(getErrorResponse.status).toBe(500);
        await expect(getErrorResponse.json()).resolves.toEqual({ error: "Failed to fetch season pass rewards" });

        vi.resetModules();
        updateAdminSeasonPassRewardsMock.mockRejectedValueOnce(new Error("Reward catalog unavailable"));
        const { PUT: putWithError } = await import("@/app/api/admin/season-pass/rewards/route");
        const putErrorResponse = await putWithError(
            request("http://localhost/api/admin/season-pass/rewards", "PUT", {
                rewards: [reward],
            }),
        );

        expect(putErrorResponse.status).toBe(500);
        await expect(putErrorResponse.json()).resolves.toEqual({ error: "Reward catalog unavailable" });

        vi.resetModules();
        requirePermissionMock.mockResolvedValueOnce(UNAUTHORIZED);
        const { PUT: putUnauthorized } = await import("@/app/api/admin/season-pass/rewards/route");
        const unauthorizedResponse = await putUnauthorized(
            request("http://localhost/api/admin/season-pass/rewards", "PUT", {
                rewards: [reward],
            }),
        );

        expect(unauthorizedResponse.status).toBe(401);
        await expect(unauthorizedResponse.json()).resolves.toEqual({ error: "Unauthorized" });
    });
});
