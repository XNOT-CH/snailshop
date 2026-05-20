import { describe, expect, it } from "vitest";
import {
    buildApprovedTopupAudit,
    buildApprovedTopupInsert,
    buildApprovedTopupResponseData,
    buildPendingTopupAudit,
    buildPendingTopupInsert,
    buildPendingTopupResponseData,
    getVerifiedTopupAmount,
} from "@/lib/features/topup/topupBuilders";
import type { SlipVerificationData } from "@/lib/features/topup/easySlipService";

const verifiedSlip: SlipVerificationData = {
    payload: "qr",
    transRef: "TX999",
    date: "2026-05-07T00:00:00.000Z",
    countryCode: "TH",
    amount: {
        amount: 500,
        local: { amount: 500, currency: "THB" },
    },
    sender: {
        bank: { name: "SCB" },
        account: { name: { th: "สมชาย" } },
    },
    receiver: {
        bank: { name: "KBANK" },
        account: { name: { th: "ร้านค้า" } },
    },
};

describe("topup builders", () => {
    it("extracts the verified amount with the route fallback behavior", () => {
        expect(getVerifiedTopupAmount(verifiedSlip)).toBe(500);
        expect(getVerifiedTopupAmount({ ...verifiedSlip, amount: { amount: 0, local: {} } })).toBe(0);
    });

    it("builds pending topup insert payloads", () => {
        expect(buildPendingTopupInsert({
            topupId: "t1",
            userId: "u1",
            requestedAmount: 100,
            proofImage: "/private/slips/1.webp",
            createdAt: "2026-05-07 10:00:00",
        })).toEqual({
            id: "t1",
            userId: "u1",
            amount: "100",
            proofImage: "/private/slips/1.webp",
            status: "PENDING",
            createdAt: "2026-05-07 10:00:00",
        });
    });

    it("builds pending audit payloads", () => {
        expect(buildPendingTopupAudit({
            topupId: "t1",
            requestedAmount: 1500,
            proofImage: null,
            verifyMethod: "base64",
            verifyTarget: "bank",
        })).toEqual({
            resource: "TopupRequest",
            resourceId: "t1",
            resourceName: "฿1,500",
            details: {
                amount: 1500,
                proofImageStored: false,
                status: "PENDING",
                verification: "manual-review",
                verifyMethod: "base64",
                verifyTarget: "bank",
            },
        });
    });

    it("builds pending response data", () => {
        expect(buildPendingTopupResponseData({
            topupId: "t1",
            requestedAmount: 100,
            proofImage: null,
        })).toEqual({
            topupId: "t1",
            amount: 100,
            status: "PENDING",
            proofImage: null,
        });
    });

    it("builds approved topup insert payloads", () => {
        expect(buildApprovedTopupInsert({
            topupId: "t2",
            userId: "u1",
            verifiedSlip,
            verifiedAmount: 500,
            proofImage: "/private/slips/2.webp",
            createdAt: "2026-05-07 10:00:00",
        })).toEqual({
            id: "t2",
            userId: "u1",
            amount: "500",
            proofImage: "/private/slips/2.webp",
            status: "APPROVED",
            transactionRef: "TX999",
            senderName: "สมชาย",
            senderBank: "SCB",
            receiverName: "ร้านค้า",
            receiverBank: "KBANK",
            createdAt: "2026-05-07 10:00:00",
        });
    });

    it("keeps nullable sender and receiver fields compatible with the route", () => {
        const sparseSlip: SlipVerificationData = {
            ...verifiedSlip,
            sender: { bank: {}, account: { name: {} } },
            receiver: { bank: {}, account: { name: {} } },
        };

        expect(buildApprovedTopupInsert({
            topupId: "t2",
            userId: "u1",
            verifiedSlip: sparseSlip,
            verifiedAmount: 500,
            proofImage: null,
            createdAt: "2026-05-07 10:00:00",
        })).toMatchObject({
            proofImage: null,
            senderName: null,
            senderBank: null,
            receiverName: null,
            receiverBank: null,
        });
    });

    it("builds approved audit payloads", () => {
        expect(buildApprovedTopupAudit({
            topupId: "t2",
            requestedAmount: 500,
            verifiedSlip,
            verifiedAmount: 500,
            proofImage: "/private/slips/2.webp",
            verifyMethod: "image",
            verifyTarget: "truewallet",
        })).toEqual({
            resource: "TopupRequest",
            resourceId: "t2",
            resourceName: "฿500",
            details: {
                amount: 500,
                requestedAmount: 500,
                transRef: "TX999",
                senderNameStored: true,
                proofImageStored: true,
                status: "APPROVED",
                verification: "automatic",
                verifyMethod: "image",
                verifyTarget: "truewallet",
            },
        });
    });

    it("builds approved response data", () => {
        expect(buildApprovedTopupResponseData({
            topupId: "t2",
            verifiedSlip,
            verifiedAmount: 500,
            proofImage: "/private/slips/2.webp",
        })).toEqual({
            topupId: "t2",
            amount: 500,
            senderName: "สมชาย",
            senderBank: "SCB",
            transRef: "TX999",
            proofImage: "/private/slips/2.webp",
            status: "APPROVED",
        });
    });
});
