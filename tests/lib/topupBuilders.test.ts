import { describe, expect, it } from "vitest";
import {
    buildApprovedTopupAudit,
    buildApprovedTopupInsert,
    buildApprovedTopupResponseData,
    buildPendingTopupAudit,
    buildPendingTopupInsert,
    buildPendingTopupResponseData,
    getVerifiedTopupAmount,
    getVerifiedTopupTransactionRef,
    type VerifiedTopupSlip,
} from "@/lib/features/topup/topupBuilders";

const bankVerifiedSlip: VerifiedTopupSlip = {
    verifyTarget: "bank",
    data: {
        isDuplicate: false,
        matchedAccount: {
            bank: {
                nameTh: "ไทยพาณิชย์",
                nameEn: "SIAM COMMERCIAL BANK",
                code: "014",
                shortCode: "SCB",
            },
            nameTh: "บริษัท ตัวอย่าง จำกัด",
            nameEn: "EXAMPLE CO., LTD.",
            type: "JURISTIC",
            bankNumber: "123-4-56789-0",
        },
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
                account: { name: { th: "บริษัท ตัวอย่าง จำกัด" } },
                merchantId: null,
            },
        },
    },
};

const walletVerifiedSlip: VerifiedTopupSlip = {
    verifyTarget: "truewallet",
    data: {
        isDuplicate: false,
        matchedAccount: {
            bank: {
                nameTh: "ทรูมันนี่ วอลเล็ท",
                nameEn: "TrueMoney Wallet",
                code: "TRUEMONEYWALLET",
                shortCode: "TRUEWALLET",
            },
            nameTh: "นาย รับเงิน ทดสอบ",
            nameEn: "",
            type: "PERSONAL",
            bankNumber: "0891234567",
        },
        amountInOrder: 500,
        amountInSlip: 500,
        isAmountMatched: true,
        rawSlip: {
            transactionId: "wallet-ref",
            date: "2024-01-15T14:30:00+07:00",
            amount: 500,
            sender: { name: "นาย ผู้โอน ทดสอบ" },
            receiver: {
                name: "นาย รับเงิน ทดสอบ",
                phone: "08x-xxx-4567",
            },
        },
    },
};

describe("topup builders", () => {
    it("builds pending topup insert payloads", () => {
        expect(buildPendingTopupInsert({
            topupId: "t1",
            userId: "u1",
            requestedAmount: 100,
            proofImage: "/private/slips/1.webp",
            verifyTarget: "bank",
            createdAt: "2026-05-07 10:00:00",
        })).toEqual({
            id: "t1",
            userId: "u1",
            amount: "100",
            proofImage: "/private/slips/1.webp",
            status: "PENDING",
            paymentMethod: "bank",
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

    it("reads verified EasySlip v2 amount and transaction refs", () => {
        expect(getVerifiedTopupAmount(bankVerifiedSlip)).toBe(1500);
        expect(getVerifiedTopupTransactionRef(bankVerifiedSlip)).toBe("bank-ref");
        expect(getVerifiedTopupAmount(walletVerifiedSlip)).toBe(500);
        expect(getVerifiedTopupTransactionRef(walletVerifiedSlip)).toBe("wallet-ref");
    });

    it("builds approved bank topup insert payloads from EasySlip v2 data", () => {
        expect(buildApprovedTopupInsert({
            topupId: "t2",
            userId: "u1",
            verifiedSlip: bankVerifiedSlip,
            verifiedAmount: 1500,
            proofImage: "/private/slips/2.webp",
            createdAt: "2026-05-07 10:00:00",
        })).toEqual({
            id: "t2",
            userId: "u1",
            amount: "1500",
            proofImage: "/private/slips/2.webp",
            status: "APPROVED",
            transactionRef: "bank-ref",
            senderName: "นาย ผู้โอน ทดสอบ",
            senderBank: "กสิกรไทย",
            receiverName: "บริษัท ตัวอย่าง จำกัด",
            receiverBank: "ไทยพาณิชย์",
            paymentMethod: "bank",
            createdAt: "2026-05-07 10:00:00",
        });
    });

    it("builds approved audit payloads without storing raw EasySlip payload data", () => {
        expect(buildApprovedTopupAudit({
            topupId: "t2",
            requestedAmount: 1500,
            verifiedSlip: bankVerifiedSlip,
            verifiedAmount: 1500,
            proofImage: null,
            verifyMethod: "payload",
        })).toEqual({
            resource: "TopupRequest",
            resourceId: "t2",
            resourceName: "฿1,500",
            details: {
                amount: 1500,
                requestedAmount: 1500,
                transRef: "bank-ref",
                proofImageStored: false,
                status: "APPROVED",
                verification: "easyslip-v2",
                verifyMethod: "payload",
                verifyTarget: "bank",
                isDuplicate: false,
                isAmountMatched: true,
                matchedAccountFound: true,
            },
        });
    });

    it("builds approved response data for wallet slips", () => {
        expect(buildApprovedTopupResponseData({
            topupId: "t3",
            verifiedSlip: walletVerifiedSlip,
            verifiedAmount: 500,
            proofImage: null,
        })).toEqual({
            topupId: "t3",
            amount: 500,
            senderName: "นาย ผู้โอน ทดสอบ",
            senderBank: null,
            transRef: "wallet-ref",
            proofImage: null,
            status: "APPROVED",
        });
    });
});
