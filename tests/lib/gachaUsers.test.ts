import { describe, expect, it, vi } from "vitest";
import { fetchGachaUserOrError } from "@/lib/features/gacha/users";

describe("lib/features/gacha/users", () => {
    it("returns the existing user wrapper when the user is found", async () => {
        const findUserById = vi.fn().mockResolvedValue({ id: "user-1" });

        await expect(fetchGachaUserOrError("user-1", findUserById)).resolves.toEqual({
            user: { id: "user-1" },
        });

        expect(findUserById).toHaveBeenCalledWith("user-1");
    });

    it("returns the existing not-found error shape when the user is missing", async () => {
        await expect(fetchGachaUserOrError("missing-user", vi.fn().mockResolvedValue(null))).resolves.toEqual({
            error: "ไม่พบผู้ใช้งาน",
            status: 404,
        });
    });

    it("treats undefined lookup results as missing users", async () => {
        await expect(fetchGachaUserOrError("missing-user", vi.fn().mockResolvedValue(undefined))).resolves.toEqual({
            error: "ไม่พบผู้ใช้งาน",
            status: 404,
        });
    });
});
