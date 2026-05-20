import { afterEach, describe, expect, it, vi } from "vitest";
import {
    verifySlipWithEasySlip,
    verifySlipWithEasySlipV2,
} from "@/lib/features/topup/easySlipService";

describe("topup EasySlip service", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    it("throws when legacy EasySlip token is not configured", async () => {
        await expect(verifySlipWithEasySlip(new File(["x"], "slip.png", { type: "image/png" })))
            .rejects
            .toThrow("EASYSLIP_NOT_CONFIGURED");
    });

    it("posts image files to legacy EasySlip v1 with duplicate checking", async () => {
        vi.stubEnv("EASYSLIP_TOKEN", "legacy-token");
        const fetchMock = vi.fn().mockResolvedValue({
            json: vi.fn().mockResolvedValue({ status: 200, data: { transRef: "TX001" } }),
        });
        vi.stubGlobal("fetch", fetchMock);

        const result = await verifySlipWithEasySlip(new File(["x"], "slip.png", { type: "image/png" }));

        expect(result.status).toBe(200);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toBe("https://developer.easyslip.com/api/v1/verify");
        expect(init.method).toBe("POST");
        expect(init.headers).toEqual({ Authorization: "Bearer legacy-token" });
        const body = init.body as FormData;
        expect(body.get("checkDuplicate")).toBe("true");
        expect(body.get("file")).toBeInstanceOf(File);
    });

    it("throws when EasySlip v2 API key is not configured", async () => {
        await expect(verifySlipWithEasySlipV2({ base64: "abc" }))
            .rejects
            .toThrow("EASYSLIP_V2_NOT_CONFIGURED");
    });

    it("posts JSON verification payloads to EasySlip v2 bank endpoint", async () => {
        vi.stubEnv("EASYSLIP_API_KEY", "v2-key");
        const fetchMock = vi.fn().mockResolvedValue({
            status: 200,
            json: vi.fn().mockResolvedValue({
                success: true,
                message: "ok",
                data: {
                    rawSlip: {
                        payload: "qr",
                        transRef: "TX999",
                        date: "2026-05-07T00:00:00.000Z",
                        countryCode: "TH",
                        amount: { amount: 500, local: { amount: 500, currency: "THB" } },
                        sender: { bank: { name: "SCB" }, account: { name: { th: "สมชาย" } } },
                        receiver: { bank: { name: "KBANK" }, account: { name: { th: "ร้านค้า" } } },
                    },
                },
            }),
        });
        vi.stubGlobal("fetch", fetchMock);

        const result = await verifySlipWithEasySlipV2({
            base64: "base64-slip",
            expectedAmount: 500,
            remark: "order-1",
        });

        expect(result.status).toBe(200);
        expect(result.data?.transRef).toBe("TX999");
        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toBe("https://api.easyslip.com/v2/verify/bank");
        expect(init.headers).toEqual({
            Authorization: "Bearer v2-key",
            "Content-Type": "application/json",
        });
        expect(JSON.parse(String(init.body))).toEqual({
            matchAccount: true,
            checkDuplicate: true,
            base64: "base64-slip",
            matchAmount: 500,
            remark: "order-1",
        });
    });

    it("posts image verification payloads to EasySlip v2 as FormData", async () => {
        vi.stubEnv("EASYSLIP_API_KEY", "v2-key");
        const fetchMock = vi.fn().mockResolvedValue({
            status: 400,
            json: vi.fn().mockResolvedValue({ success: false, error: { code: "INVALID_IMAGE" } }),
        });
        vi.stubGlobal("fetch", fetchMock);

        const result = await verifySlipWithEasySlipV2({
            image: new File(["x"], "slip.jpg", { type: "image/jpeg" }),
            expectedAmount: 100,
            remark: "image-flow",
        });

        expect(result.status).toBe(400);
        expect(result.message).toBe("รูปภาพไม่ใช่สลิปที่ถูกต้อง");
        const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(init.headers).toEqual({ Authorization: "Bearer v2-key" });
        const body = init.body as FormData;
        expect(body.get("matchAccount")).toBe("true");
        expect(body.get("checkDuplicate")).toBe("true");
        expect(body.get("matchAmount")).toBe("100");
        expect(body.get("remark")).toBe("image-flow");
        expect(body.get("image")).toBeInstanceOf(File);
    });

    it("does not call EasySlip v2 when truewallet is requested with a QR payload", async () => {
        vi.stubEnv("EASYSLIP_API_KEY", "v2-key");
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);

        const result = await verifySlipWithEasySlipV2({ payload: "qr" }, "truewallet");

        expect(result).toEqual({
            status: 400,
            message: "TrueMoney Wallet does not support payload verification",
        });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("maps truewallet raw slips to the shared verification result shape", async () => {
        vi.stubEnv("EASYSLIP_API_KEY", "v2-key");
        const fetchMock = vi.fn().mockResolvedValue({
            status: 200,
            json: vi.fn().mockResolvedValue({
                success: true,
                message: "wallet ok",
                data: {
                    rawSlip: {
                        transactionId: "TW001",
                        date: "2026-05-07T00:00:00.000Z",
                        amount: 120,
                        sender: { name: "ผู้ส่ง" },
                        receiver: { name: "ร้านค้า", phone: "0812345678" },
                    },
                },
            }),
        });
        vi.stubGlobal("fetch", fetchMock);

        const result = await verifySlipWithEasySlipV2({ base64: "wallet-slip" }, "truewallet");

        expect(result.status).toBe(200);
        expect(result.data?.transRef).toBe("TW001");
        expect(result.data?.amount.amount).toBe(120);
        expect(result.data?.sender.bank.name).toBe("TrueMoney Wallet");
        expect(result.data?.receiver.account.proxy).toEqual({
            type: "MSISDN",
            account: "0812345678",
        });
        const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toBe("https://api.easyslip.com/v2/verify/truewallet");
    });

    it("returns an incomplete slip response when EasySlip v2 has no raw slip reference", async () => {
        vi.stubEnv("EASYSLIP_API_KEY", "v2-key");
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            status: 200,
            json: vi.fn().mockResolvedValue({ success: true, data: { rawSlip: {} } }),
        }));

        const result = await verifySlipWithEasySlipV2({ base64: "missing-slip" });

        expect(result).toEqual({
            status: 400,
            message: "ข้อมูลสลิปไม่สมบูรณ์",
        });
    });
});
