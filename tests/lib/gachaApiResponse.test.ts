import { describe, expect, it } from "vitest";
import { gachaApiError, gachaApiSuccess } from "@/lib/features/gacha/apiResponse";

describe("lib/features/gacha/apiResponse", () => {
    it("returns the existing admin gacha success body without a message by default", async () => {
        const data = { id: "default", isEnabled: true };

        const response = gachaApiSuccess(data);

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            success: true,
            data,
        });
    });

    it("preserves the existing admin gacha success body with a message", async () => {
        const data = { id: "default", isEnabled: true };

        const response = gachaApiSuccess(data, {
            message: "บันทึกการตั้งค่ากาชาสำเร็จ",
        });

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            success: true,
            message: "บันทึกการตั้งค่ากาชาสำเร็จ",
            data,
        });
    });

    it("returns the existing admin gacha error body and custom status", async () => {
        const response = gachaApiError("ไม่มีสิทธิ์เข้าถึง", { status: 401 });

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({
            success: false,
            message: "ไม่มีสิทธิ์เข้าถึง",
        });
    });

    it("can preserve routes that return only success false", async () => {
        const response = gachaApiError(undefined, { status: 401 });

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({
            success: false,
        });
    });
});
