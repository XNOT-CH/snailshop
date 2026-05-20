import { describe, expect, it } from "vitest";
import { seasonPassApiError } from "@/lib/features/seasonPass/apiResponse";

describe("lib/features/seasonPass/apiResponse", () => {
    it("preserves the existing season-pass message error body", async () => {
        const response = seasonPassApiError("ไม่มีสิทธิ์เข้าถึง", { status: 401 });

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({
            success: false,
            message: "ไม่มีสิทธิ์เข้าถึง",
        });
    });

    it("can preserve undefined-message auth failures", async () => {
        const response = seasonPassApiError(undefined, { status: 401 });

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({
            success: false,
        });
    });
});
