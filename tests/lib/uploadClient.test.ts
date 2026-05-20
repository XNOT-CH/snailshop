import { describe, expect, it, vi } from "vitest";
import {
    buildUploadFormData,
    parseUploadResponse,
    uploadFileToApi,
} from "@/lib/client/uploadClient";
import { API_ROUTES } from "@/lib/constants/apiRoutes";

function getSentFormData(fetcher: ReturnType<typeof vi.fn>) {
    return fetcher.mock.calls[0]?.[1]?.body as FormData;
}

describe("lib/client/uploadClient", () => {
    it("builds FormData with the existing file field by default", () => {
        const file = new File(["image"], "banner.png", { type: "image/png" });

        const formData = buildUploadFormData(file);

        expect(formData.get("file")).toBe(file);
    });

    it("posts uploads to the shared upload endpoint and parses the response", async () => {
        const file = new File(["image"], "news.webp", { type: "image/webp" });
        const responseBody = { success: true as const, url: "/uploads/products/news.webp" };
        const fetcher = vi.fn(async () => Response.json(responseBody));

        const result = await uploadFileToApi(file, { fetcher });

        expect(result).toEqual(responseBody);
        expect(fetcher).toHaveBeenCalledWith(API_ROUTES.UPLOAD, {
            method: "POST",
            body: expect.any(FormData),
        });
        expect(getSentFormData(fetcher).get("file")).toBe(file);
    });

    it("allows callers to keep a custom endpoint or field contract when needed", async () => {
        const file = new File(["image"], "custom.png", { type: "image/png" });
        const fetcher = vi.fn(async () =>
            Response.json({ success: false as const, message: "Upload failed" }),
        );

        const result = await uploadFileToApi(file, {
            endpoint: "/api/custom-upload",
            fieldName: "image",
            fetcher,
        });

        expect(result).toEqual({ success: false, message: "Upload failed" });
        expect(fetcher).toHaveBeenCalledWith("/api/custom-upload", {
            method: "POST",
            body: expect.any(FormData),
        });
        expect(getSentFormData(fetcher).get("image")).toBe(file);
    });

    it("parses upload responses without changing their success or message fields", async () => {
        const response = Response.json({
            success: false,
            message: "อัปโหลดรูปไม่สำเร็จ",
        });

        await expect(parseUploadResponse(response)).resolves.toEqual({
            success: false,
            message: "อัปโหลดรูปไม่สำเร็จ",
        });
    });
});
