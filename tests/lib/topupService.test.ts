import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    auditFromRequestMock,
    encryptTopupSensitiveFieldsMock,
    eqMock,
    insertMock,
    mysqlNowMock,
    queryTopupFindFirstMock,
    setMock,
    sqlMock,
    transactionMock,
    txInsertMock,
    txSetMock,
    txUpdateMock,
    txValuesMock,
    txWhereMock,
    updateMock,
    valuesMock,
    whereMock,
} = vi.hoisted(() => ({
    auditFromRequestMock: vi.fn(),
    encryptTopupSensitiveFieldsMock: vi.fn((record: Record<string, unknown>) => ({
        ...record,
        encrypted: true,
    })),
    eqMock: vi.fn(() => "eq-condition"),
    insertMock: vi.fn(),
    mysqlNowMock: vi.fn(() => "2026-05-07 10:00:00"),
    queryTopupFindFirstMock: vi.fn(),
    setMock: vi.fn(),
    sqlMock: vi.fn(() => "sql-expression"),
    transactionMock: vi.fn(),
    txInsertMock: vi.fn(),
    txSetMock: vi.fn(),
    txUpdateMock: vi.fn(),
    txValuesMock: vi.fn(),
    txWhereMock: vi.fn(),
    updateMock: vi.fn(),
    valuesMock: vi.fn(),
    whereMock: vi.fn(),
}));

vi.mock("@/lib/auditLog", () => ({
    auditFromRequest: auditFromRequestMock,
    AUDIT_ACTIONS: {
        TOPUP_REQUEST: "TOPUP_REQUEST",
    },
}));

vi.mock("@/lib/db", () => ({
    db: {
        insert: insertMock,
        query: {
            topups: {
                findFirst: queryTopupFindFirstMock,
            },
        },
        transaction: transactionMock,
        update: updateMock,
    },
    topups: {
        id: "id",
        transactionRef: "transaction_ref",
    },
    users: {
        id: "user_id",
    },
}));

vi.mock("drizzle-orm", () => ({
    eq: eqMock,
    sql: sqlMock,
}));

vi.mock("@/lib/sensitiveData", () => ({
    encryptTopupSensitiveFields: encryptTopupSensitiveFieldsMock,
}));

vi.mock("@/lib/utils/date", () => ({
    mysqlNow: mysqlNowMock,
}));

import { topups } from "@/lib/db";
import {
    createApprovedTopup,
    createPendingTopup,
    hasDuplicateTopupTransactionRef,
} from "@/lib/features/topup/topupService";
import type { VerifiedTopupSlip } from "@/lib/features/topup/topupBuilders";

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

describe("topup service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        insertMock.mockReturnValue({ values: valuesMock });
        transactionMock.mockImplementation(async (callback) => callback({
            insert: txInsertMock,
            update: txUpdateMock,
        }));
        txInsertMock.mockReturnValue({ values: txValuesMock });
        txUpdateMock.mockReturnValue({ set: txSetMock });
        txSetMock.mockReturnValue({ where: txWhereMock });
        updateMock.mockReturnValue({ set: setMock });
        setMock.mockReturnValue({ where: whereMock });
    });

    it("creates pending topup records and writes audit logs", async () => {
        const request = new Request("http://localhost/api/topup", { method: "POST" });

        const result = await createPendingTopup({
            request,
            topupId: "t1",
            userId: "u1",
            requestedAmount: 1500,
            proofImage: "/private/slips/t1.webp",
            verifyMethod: "base64",
            verifyTarget: "bank",
        });

        expect(insertMock).toHaveBeenCalledWith(topups);
        expect(encryptTopupSensitiveFieldsMock).toHaveBeenCalledWith({
            id: "t1",
            userId: "u1",
            amount: "1500",
            proofImage: "/private/slips/t1.webp",
            status: "PENDING",
            createdAt: "2026-05-07 10:00:00",
        });
        expect(valuesMock).toHaveBeenCalledWith({
            id: "t1",
            userId: "u1",
            amount: "1500",
            proofImage: "/private/slips/t1.webp",
            status: "PENDING",
            createdAt: "2026-05-07 10:00:00",
            encrypted: true,
        });
        expect(auditFromRequestMock).toHaveBeenCalledWith(request, {
            action: "TOPUP_REQUEST",
            resource: "TopupRequest",
            resourceId: "t1",
            resourceName: "฿1,500",
            details: {
                amount: 1500,
                proofImageStored: true,
                status: "PENDING",
                verification: "manual-review",
                verifyMethod: "base64",
                verifyTarget: "bank",
            },
        });
        expect(result).toEqual({
            topupId: "t1",
            amount: 1500,
            status: "PENDING",
            proofImage: "/private/slips/t1.webp",
        });
    });

    it("preserves null proof image behavior for pending manual review", async () => {
        const request = new Request("http://localhost/api/topup", { method: "POST" });

        const result = await createPendingTopup({
            request,
            topupId: "t2",
            userId: "u2",
            requestedAmount: 100,
            proofImage: null,
            verifyMethod: "image",
            verifyTarget: "truewallet",
        });

        expect(encryptTopupSensitiveFieldsMock).toHaveBeenCalledWith(expect.objectContaining({
            proofImage: null,
        }));
        expect(auditFromRequestMock).toHaveBeenCalledWith(request, expect.objectContaining({
            details: expect.objectContaining({
                proofImageStored: false,
                verifyMethod: "image",
                verifyTarget: "truewallet",
            }),
        }));
        expect(result.proofImage).toBeNull();
    });

    it("creates approved topup records and updates the user balance", async () => {
        const request = new Request("http://localhost/api/topup", { method: "POST" });

        const result = await createApprovedTopup({
            request,
            topupId: "t3",
            userId: "u3",
            requestedAmount: 1500,
            verifiedSlip: bankVerifiedSlip,
            verifiedAmount: 1500,
            proofImage: "/private/slips/t3.webp",
            verifyMethod: "payload",
        });

        expect(txInsertMock).toHaveBeenCalledWith(topups);
        expect(encryptTopupSensitiveFieldsMock).toHaveBeenCalledWith({
            id: "t3",
            userId: "u3",
            amount: "1500",
            proofImage: "/private/slips/t3.webp",
            status: "APPROVED",
            transactionRef: "bank-ref",
            senderName: "นาย ผู้โอน ทดสอบ",
            senderBank: "กสิกรไทย",
            receiverName: "บริษัท ตัวอย่าง จำกัด",
            receiverBank: "ไทยพาณิชย์",
            createdAt: "2026-05-07 10:00:00",
        });
        expect(txValuesMock).toHaveBeenCalledWith(expect.objectContaining({
            id: "t3",
            status: "APPROVED",
            transactionRef: "bank-ref",
            encrypted: true,
        }));
        expect(txUpdateMock).toHaveBeenCalled();
        expect(txSetMock).toHaveBeenCalledWith({
            creditBalance: "sql-expression",
            totalTopup: "sql-expression",
        });
        expect(eqMock).toHaveBeenCalledWith("user_id", "u3");
        expect(txWhereMock).toHaveBeenCalledWith("eq-condition");
        expect(auditFromRequestMock).toHaveBeenCalledWith(request, expect.objectContaining({
            action: "TOPUP_REQUEST",
            resource: "TopupRequest",
            resourceId: "t3",
            details: expect.objectContaining({
                verification: "easyslip-v2",
                verifyMethod: "payload",
                verifyTarget: "bank",
                transRef: "bank-ref",
            }),
        }));
        expect(result).toEqual({
            topupId: "t3",
            amount: 1500,
            senderName: "นาย ผู้โอน ทดสอบ",
            senderBank: "กสิกรไทย",
            transRef: "bank-ref",
            proofImage: "/private/slips/t3.webp",
            status: "APPROVED",
        });
    });

    it("detects duplicate topup transaction refs", async () => {
        queryTopupFindFirstMock.mockResolvedValueOnce({ id: "existing" });
        await expect(hasDuplicateTopupTransactionRef("bank-ref")).resolves.toBe(true);

        queryTopupFindFirstMock.mockResolvedValueOnce(null);
        await expect(hasDuplicateTopupTransactionRef("new-ref")).resolves.toBe(false);
    });
});
