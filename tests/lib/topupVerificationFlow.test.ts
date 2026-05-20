import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    verifySlipWithEasySlipMock,
    verifySlipWithEasySlipV2Mock,
} = vi.hoisted(() => ({
    verifySlipWithEasySlipMock: vi.fn(),
    verifySlipWithEasySlipV2Mock: vi.fn(),
}));

vi.mock("@/lib/features/topup/easySlipService", () => ({
    verifySlipWithEasySlip: verifySlipWithEasySlipMock,
    verifySlipWithEasySlipV2: verifySlipWithEasySlipV2Mock,
}));

import { verifyTopupSlip } from "@/lib/features/topup/topupVerificationFlow";

describe("topup verification flow", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("verifies QR payloads with EasySlip v2", async () => {
        verifySlipWithEasySlipV2Mock.mockResolvedValue({ status: 200, data: { transRef: "qr-ref" } });

        const result = await verifyTopupSlip({
            qrPayload: "qr-payload",
            base64: null,
            imageUrl: null,
            file: null,
            requestedAmount: 500,
            remark: "order-1",
            verifyTarget: "bank",
        });

        expect(result).toEqual({
            verificationResult: { status: 200, data: { transRef: "qr-ref" } },
            shouldFallbackToPending: false,
        });
        expect(verifySlipWithEasySlipV2Mock).toHaveBeenCalledWith({
            payload: "qr-payload",
            expectedAmount: 500,
            remark: "order-1",
        }, "bank");
        expect(verifySlipWithEasySlipMock).not.toHaveBeenCalled();
    });

    it("verifies base64 and URL inputs with EasySlip v2", async () => {
        verifySlipWithEasySlipV2Mock.mockResolvedValueOnce({ status: 200, data: { transRef: "base64-ref" } });
        verifySlipWithEasySlipV2Mock.mockResolvedValueOnce({ status: 200, data: { transRef: "url-ref" } });

        await verifyTopupSlip({
            qrPayload: null,
            base64: "base64-slip",
            imageUrl: null,
            file: null,
            requestedAmount: 100,
            remark: null,
            verifyTarget: "truewallet",
        });
        await verifyTopupSlip({
            qrPayload: null,
            base64: null,
            imageUrl: "https://example.com/slip.png",
            file: null,
            requestedAmount: 200,
            remark: "url-note",
            verifyTarget: "bank",
        });

        expect(verifySlipWithEasySlipV2Mock).toHaveBeenNthCalledWith(1, {
            base64: "base64-slip",
            expectedAmount: 100,
            remark: undefined,
        }, "truewallet");
        expect(verifySlipWithEasySlipV2Mock).toHaveBeenNthCalledWith(2, {
            url: "https://example.com/slip.png",
            expectedAmount: 200,
            remark: "url-note",
        }, "bank");
    });

    it("verifies files with EasySlip v2 first", async () => {
        const file = new File(["image"], "slip.png", { type: "image/png" });
        verifySlipWithEasySlipV2Mock.mockResolvedValue({ status: 200, data: { transRef: "file-v2-ref" } });

        const result = await verifyTopupSlip({
            qrPayload: null,
            base64: null,
            imageUrl: null,
            file,
            requestedAmount: 300,
            remark: "file-note",
            verifyTarget: "bank",
        });

        expect(result.shouldFallbackToPending).toBe(false);
        expect(result.verificationResult).toEqual({ status: 200, data: { transRef: "file-v2-ref" } });
        expect(verifySlipWithEasySlipV2Mock).toHaveBeenCalledWith({
            image: file,
            expectedAmount: 300,
            remark: "file-note",
        }, "bank");
        expect(verifySlipWithEasySlipMock).not.toHaveBeenCalled();
    });

    it("falls back to legacy EasySlip v1 when file v2 is not configured", async () => {
        const file = new File(["image"], "slip.png", { type: "image/png" });
        verifySlipWithEasySlipV2Mock.mockRejectedValue(new Error("EASYSLIP_V2_NOT_CONFIGURED"));
        verifySlipWithEasySlipMock.mockResolvedValue({ status: 200, data: { transRef: "legacy-ref" } });

        const result = await verifyTopupSlip({
            qrPayload: null,
            base64: null,
            imageUrl: null,
            file,
            requestedAmount: 300,
            remark: null,
            verifyTarget: "bank",
        });

        expect(result).toEqual({
            verificationResult: { status: 200, data: { transRef: "legacy-ref" } },
            shouldFallbackToPending: false,
        });
        expect(verifySlipWithEasySlipMock).toHaveBeenCalledWith(file);
    });

    it("falls back to pending when EasySlip configuration is missing", async () => {
        verifySlipWithEasySlipV2Mock.mockRejectedValue(new Error("EASYSLIP_V2_NOT_CONFIGURED"));

        const result = await verifyTopupSlip({
            qrPayload: null,
            base64: "base64-slip",
            imageUrl: null,
            file: null,
            requestedAmount: 100,
            remark: null,
            verifyTarget: "bank",
        });

        expect(result).toEqual({
            verificationResult: null,
            shouldFallbackToPending: true,
        });
    });

    it("falls back to pending when legacy EasySlip is also not configured", async () => {
        const file = new File(["image"], "slip.png", { type: "image/png" });
        verifySlipWithEasySlipV2Mock.mockRejectedValue(new Error("EASYSLIP_V2_NOT_CONFIGURED"));
        verifySlipWithEasySlipMock.mockRejectedValue(new Error("EASYSLIP_NOT_CONFIGURED"));

        await expect(verifyTopupSlip({
            qrPayload: null,
            base64: null,
            imageUrl: null,
            file,
            requestedAmount: 100,
            remark: null,
            verifyTarget: "bank",
        })).resolves.toEqual({
            verificationResult: null,
            shouldFallbackToPending: true,
        });
    });

    it("logs external verification errors and falls back to pending", async () => {
        const error = new Error("NETWORK_DOWN");
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
        verifySlipWithEasySlipV2Mock.mockRejectedValue(error);

        const result = await verifyTopupSlip({
            qrPayload: "qr-payload",
            base64: null,
            imageUrl: null,
            file: null,
            requestedAmount: 100,
            remark: null,
            verifyTarget: "bank",
        });

        expect(result).toEqual({
            verificationResult: null,
            shouldFallbackToPending: true,
        });
        expect(consoleErrorSpy).toHaveBeenCalledWith("[TOPUP_EASYSLIP]", error);

        consoleErrorSpy.mockRestore();
    });

    it("returns EasySlip non-200 results without forcing pending fallback", async () => {
        verifySlipWithEasySlipV2Mock.mockResolvedValue({ status: 400, message: "invalid_image" });

        await expect(verifyTopupSlip({
            qrPayload: null,
            base64: "base64-slip",
            imageUrl: null,
            file: null,
            requestedAmount: 100,
            remark: null,
            verifyTarget: "bank",
        })).resolves.toEqual({
            verificationResult: { status: 400, message: "invalid_image" },
            shouldFallbackToPending: false,
        });
    });
});
