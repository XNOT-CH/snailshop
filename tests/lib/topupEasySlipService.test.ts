import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    EASYSLIP_V2_INFO_URL,
    EASYSLIP_V2_VERIFY_BANK_URL,
    EASYSLIP_V2_VERIFY_TRUEWALLET_URL,
    getEasySlipInfo,
    verifyBankSlipWithEasySlipV2,
    verifyTrueWalletSlipWithEasySlipV2,
} from "@/lib/features/topup/easySlipService";

const fetchMock = vi.fn();

function mockEasySlipResponse(body: unknown, status = 200) {
    fetchMock.mockResolvedValue({
        status,
        json: vi.fn().mockResolvedValue(body),
    });
}

describe("EasySlip API v2 service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.EASYSLIP_API_KEY = "test-easyslip-key";
        vi.stubGlobal("fetch", fetchMock);
    });

    it("gets EasySlip info through the v2 info endpoint", async () => {
        mockEasySlipResponse({
            success: true,
            data: {
                application: {
                    name: "App",
                    autoRenew: {
                        expired: false,
                        quota: true,
                        createdAt: "2024-01-01T00:00:00+07:00",
                        expiresAt: "2025-01-01T00:00:00+07:00",
                    },
                    quota: {
                        used: 1,
                        max: 100,
                        remaining: 99,
                        totalUsed: 1,
                    },
                },
                branch: {
                    name: "Main",
                    isActive: true,
                    quota: {
                        used: 1,
                        totalUsed: 1,
                    },
                },
                account: {
                    email: "owner@example.com",
                    credit: 100,
                },
                product: {
                    name: "Pro Plan",
                },
            },
            message: "Information retrieved successfully",
        });

        const result = await getEasySlipInfo();

        expect(result.status).toBe(200);
        expect(fetchMock).toHaveBeenCalledWith(EASYSLIP_V2_INFO_URL, expect.objectContaining({
            method: "GET",
        }));
        const headers = fetchMock.mock.calls[0][1].headers as Headers;
        expect(headers.get("Authorization")).toBe("Bearer test-easyslip-key");
    });

    it("verifies bank slips with payload using only the v2 bank endpoint and documented JSON fields", async () => {
        mockEasySlipResponse({
            success: false,
            error: {
                code: "SLIP_NOT_FOUND",
                message: "The slip could not be found or is invalid",
            },
        }, 404);

        const result = await verifyBankSlipWithEasySlipV2({
            payload: "QR_PAYLOAD",
            remark: "Order #123",
            matchAccount: true,
            matchAmount: 1500,
            checkDuplicate: true,
        });

        expect(result).toEqual({
            status: 404,
            response: {
                success: false,
                error: {
                    code: "SLIP_NOT_FOUND",
                    message: "The slip could not be found or is invalid",
                },
            },
        });
        expect(fetchMock).toHaveBeenCalledWith(EASYSLIP_V2_VERIFY_BANK_URL, expect.any(Object));
        const init = fetchMock.mock.calls[0][1] as RequestInit;
        const headers = init.headers as Headers;
        expect(headers.get("Authorization")).toBe("Bearer test-easyslip-key");
        expect(headers.get("Content-Type")).toBe("application/json");
        expect(JSON.parse(String(init.body))).toEqual({
            payload: "QR_PAYLOAD",
            remark: "Order #123",
            matchAccount: true,
            matchAmount: 1500,
            checkDuplicate: true,
        });
    });

    it("verifies bank slips with image as multipart/form-data without setting a JSON content type", async () => {
        mockEasySlipResponse({
            success: true,
            data: {
                remark: "Order #123",
                isDuplicate: false,
                matchedAccount: null,
                amountInOrder: 1500,
                amountInSlip: 1500,
                isAmountMatched: true,
                rawSlip: {
                    payload: "payload",
                    transRef: "bank-ref",
                    date: "2024-01-15T14:30:00+07:00",
                    countryCode: "TH",
                    amount: {
                        amount: 1500,
                        local: {
                            amount: 1500,
                            currency: "THB",
                        },
                    },
                    fee: 0,
                    ref1: "",
                    ref2: "",
                    ref3: "",
                    sender: {
                        bank: { id: "004", name: "กสิกรไทย", short: "KBANK" },
                        account: { name: { th: "นาย ผู้โอน ทดสอบ" } },
                    },
                    receiver: {
                        bank: { id: "014", name: "ไทยพาณิชย์", short: "SCB" },
                        account: { name: { th: "นาย รับเงิน ทดสอบ" } },
                        merchantId: null,
                    },
                },
            },
            message: "Bank slip verified successfully",
        });
        const file = new File(["image"], "slip.png", { type: "image/png" });

        const result = await verifyBankSlipWithEasySlipV2({
            image: file,
            matchAccount: true,
            matchAmount: 1500,
            checkDuplicate: true,
        });

        expect(result.response.success).toBe(true);
        expect(fetchMock).toHaveBeenCalledWith(EASYSLIP_V2_VERIFY_BANK_URL, expect.any(Object));
        const init = fetchMock.mock.calls[0][1] as RequestInit;
        const headers = init.headers as Headers;
        const body = init.body as FormData;
        const image = body.get("image") as File;
        expect(headers.get("Content-Type")).toBeNull();
        expect(image.name).toBe("slip.png");
        expect(image.type).toBe("image/png");
        expect(image.size).toBe(file.size);
        expect(body.get("matchAccount")).toBe("true");
        expect(body.get("matchAmount")).toBe("1500");
        expect(body.get("checkDuplicate")).toBe("true");
    });

    it("verifies TrueMoney Wallet slips through the v2 truewallet endpoint without payload support", async () => {
        mockEasySlipResponse({
            success: true,
            data: {
                isDuplicate: false,
                matchedAccount: null,
                amountInOrder: 500,
                amountInSlip: 500,
                isAmountMatched: true,
                rawSlip: {
                    transactionId: "wallet-ref",
                    date: "2024-01-15T14:30:00+07:00",
                    amount: 500,
                    sender: {
                        name: "นาย ผู้โอน ทดสอบ",
                    },
                    receiver: {
                        name: "นาย รับเงิน ทดสอบ",
                        phone: "08x-xxx-4567",
                    },
                },
            },
            message: "TrueMoney Wallet slip verified successfully",
        });

        await verifyTrueWalletSlipWithEasySlipV2({
            base64: "data:image/jpeg;base64,aGVsbG8=",
            checkDuplicate: true,
        });

        expect(fetchMock).toHaveBeenCalledWith(EASYSLIP_V2_VERIFY_TRUEWALLET_URL, expect.any(Object));
        const init = fetchMock.mock.calls[0][1] as RequestInit;
        expect(JSON.parse(String(init.body))).toEqual({
            base64: "data:image/jpeg;base64,aGVsbG8=",
            checkDuplicate: true,
        });
    });

    it("requires EASYSLIP_API_KEY server-side before making requests", async () => {
        vi.stubEnv("EASYSLIP_API_KEY", undefined);

        await expect(verifyBankSlipWithEasySlipV2({
            payload: "QR_PAYLOAD",
            checkDuplicate: true,
        })).rejects.toThrow("EASYSLIP_API_KEY is not configured.");
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
