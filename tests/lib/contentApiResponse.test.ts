import { describe, expect, it } from "vitest";
import { contentApiError } from "@/lib/features/content/apiResponse";

describe("lib/features/content/apiResponse", () => {
    it("preserves the existing content/settings error body", async () => {
        const response = contentApiError("Unauthorized", { status: 401 });

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({
            error: "Unauthorized",
        });
    });

    it("uses the default JSON response status when no init is provided", async () => {
        const response = contentApiError("Failed to fetch settings");

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            error: "Failed to fetch settings",
        });
    });
});
