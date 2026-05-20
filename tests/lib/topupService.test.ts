import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    auditFromRequestMock,
    encryptTopupSensitiveFieldsMock,
    eqMock,
    findFirstTopupMock,
    insertMock,
    mysqlNowMock,
    sqlMock,
    transactionMock,
    txInsertMock,
    txInsertValuesMock,
    txUpdateMock,
    txUpdateSetMock,
    txUpdateWhereMock,
    valuesMock,
} = vi.hoisted(() => ({
    auditFromRequestMock: vi.fn(),
    encryptTopupSensitiveFieldsMock: vi.fn((record: Record<string, unknown>) => ({
        ...record,
        encrypted: true,
    })),
    eqMock: vi.fn((left: unknown, right: unknown) => ({ left, right, type: "eq" })),
    findFirstTopupMock: vi.fn(),
    insertMock: vi.fn(),
    mysqlNowMock: vi.fn(() => "2026-05-07 10:00:00"),
    sqlMock: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({ strings: Array.from(strings), values })),
    transactionMock: vi.fn(),
    txInsertMock: vi.fn(),
    txInsertValuesMock: vi.fn(),
    txUpdateMock: vi.fn(),
    txUpdateSetMock: vi.fn(),
    txUpdateWhereMock: vi.fn(),
    valuesMock: vi.fn(),
}));

vi.mock("drizzle-orm", () => ({
    eq: eqMock,
    sql: sqlMock,
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
                findFirst: findFirstTopupMock,
            },
        },
        transaction: transactionMock,
    },
    topups: {
        id: "id",
        transactionRef: "transaction_ref",
    },
    users: {
        id: "user_id",
    },
}));

vi.mock("@/lib/sensitiveData", () => ({
    encryptTopupSensitiveFields: encryptTopupSensitiveFieldsMock,
}));

vi.mock("@/lib/utils/date", () => ({
    mysqlNow: mysqlNowMock,
}));

import { topups, users } from "@/lib/db";
import type { SlipVerificationData } from "@/lib/features/topup/easySlipService";
import {
    createApprovedTopup,
    createPendingTopup,
    hasDuplicateTopupTransactionRef,
} from "@/lib/features/topup/topupService";

describe("topup service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        insertMock.mockReturnValue({ values: valuesMock });
        txInsertMock.mockReturnValue({ values: txInsertValuesMock });
        txUpdateMock.mockReturnValue({ set: txUpdateSetMock });
        txUpdateSetMock.mockReturnValue({ where: txUpdateWhereMock });
        transactionMock.mockImplementation(async (callback: (tx: {
            insert: typeof txInsertMock;
            update: typeof txUpdateMock;
        }) => Promise<void>) => {
            await callback({
                insert: txInsertMock,
                update: txUpdateMock,
            });
        });
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

    it("creates approved topup transaction, updates balance, and writes audit logs", async () => {
        const request = new Request("http://localhost/api/topup", { method: "POST" });
        const verifiedSlip: SlipVerificationData = {
            payload: "payload",
            transRef: "ref-1",
            date: "2026-05-07T10:00:00+07:00",
            countryCode: "TH",
            amount: {
                amount: 500,
                local: {
                    amount: 500,
                    currency: "THB",
                },
            },
            sender: {
                bank: { name: "Sender Bank" },
                account: {
                    name: {
                        th: "ผู้โอน",
                    },
                },
            },
            receiver: {
                bank: { name: "Receiver Bank" },
                account: {
                    name: {
                        th: "ผู้รับ",
                    },
                },
            },
        };

        const result = await createApprovedTopup({
            request,
            topupId: "t3",
            userId: "u3",
            requestedAmount: 500,
            verifiedSlip,
            verifiedAmount: 500,
            proofImage: "/private/slips/t3.webp",
            verifyMethod: "payload",
            verifyTarget: "bank",
        });

        expect(transactionMock).toHaveBeenCalledTimes(1);
        expect(txInsertMock).toHaveBeenCalledWith(topups);
        expect(encryptTopupSensitiveFieldsMock).toHaveBeenCalledWith({
            id: "t3",
            userId: "u3",
            amount: "500",
            proofImage: "/private/slips/t3.webp",
            status: "APPROVED",
            transactionRef: "ref-1",
            senderName: "ผู้โอน",
            senderBank: "Sender Bank",
            receiverName: "ผู้รับ",
            receiverBank: "Receiver Bank",
            createdAt: "2026-05-07 10:00:00",
        });
        expect(txInsertValuesMock).toHaveBeenCalledWith({
            id: "t3",
            userId: "u3",
            amount: "500",
            proofImage: "/private/slips/t3.webp",
            status: "APPROVED",
            transactionRef: "ref-1",
            senderName: "ผู้โอน",
            senderBank: "Sender Bank",
            receiverName: "ผู้รับ",
            receiverBank: "Receiver Bank",
            createdAt: "2026-05-07 10:00:00",
            encrypted: true,
        });
        expect(txUpdateMock).toHaveBeenCalledWith(users);
        expect(sqlMock).toHaveBeenCalledTimes(2);
        expect(txUpdateSetMock).toHaveBeenCalledWith({
            creditBalance: {
                strings: ["creditBalance + ", ""],
                values: [500],
            },
            totalTopup: {
                strings: ["totalTopup + ", ""],
                values: [500],
            },
        });
        expect(eqMock).toHaveBeenCalledWith(users.id, "u3");
        expect(txUpdateWhereMock).toHaveBeenCalledWith({
            left: users.id,
            right: "u3",
            type: "eq",
        });
        expect(auditFromRequestMock).toHaveBeenCalledWith(request, {
            action: "TOPUP_REQUEST",
            resource: "TopupRequest",
            resourceId: "t3",
            resourceName: "฿500",
            details: {
                amount: 500,
                requestedAmount: 500,
                transRef: "ref-1",
                senderNameStored: true,
                proofImageStored: true,
                status: "APPROVED",
                verification: "automatic",
                verifyMethod: "payload",
                verifyTarget: "bank",
            },
        });
        expect(result).toEqual({
            topupId: "t3",
            amount: 500,
            senderName: "ผู้โอน",
            senderBank: "Sender Bank",
            transRef: "ref-1",
            proofImage: "/private/slips/t3.webp",
            status: "APPROVED",
        });
    });

    it("preserves null approved topup sensitive fields", async () => {
        const request = new Request("http://localhost/api/topup", { method: "POST" });
        const verifiedSlip: SlipVerificationData = {
            payload: "",
            transRef: "wallet-ref-1",
            date: "2026-05-07T10:00:00+07:00",
            countryCode: "TH",
            amount: {
                amount: 300,
                local: {},
            },
            sender: {
                bank: {},
                account: {
                    name: {},
                },
            },
            receiver: {
                bank: {},
                account: {
                    name: {},
                },
            },
        };

        const result = await createApprovedTopup({
            request,
            topupId: "t4",
            userId: "u4",
            requestedAmount: 250,
            verifiedSlip,
            verifiedAmount: 300,
            proofImage: null,
            verifyMethod: "image",
            verifyTarget: "truewallet",
        });

        expect(encryptTopupSensitiveFieldsMock).toHaveBeenCalledWith(expect.objectContaining({
            proofImage: null,
            senderName: null,
            senderBank: null,
            receiverName: null,
            receiverBank: null,
        }));
        expect(auditFromRequestMock).toHaveBeenCalledWith(request, expect.objectContaining({
            details: expect.objectContaining({
                requestedAmount: 250,
                proofImageStored: false,
                senderNameStored: false,
                verifyMethod: "image",
                verifyTarget: "truewallet",
            }),
        }));
        expect(result).toEqual({
            topupId: "t4",
            amount: 300,
            senderName: undefined,
            senderBank: undefined,
            transRef: "wallet-ref-1",
            proofImage: null,
            status: "APPROVED",
        });
    });

    it("detects duplicate topup transaction refs", async () => {
        findFirstTopupMock.mockResolvedValue({ id: "existing-topup" });

        const result = await hasDuplicateTopupTransactionRef("ref-duplicate");

        expect(result).toBe(true);
        expect(eqMock).toHaveBeenCalledWith(topups.transactionRef, "ref-duplicate");
        expect(findFirstTopupMock).toHaveBeenCalledWith({
            where: {
                left: topups.transactionRef,
                right: "ref-duplicate",
                type: "eq",
            },
            columns: { id: true },
        });
    });

    it("returns false when topup transaction ref is unused", async () => {
        findFirstTopupMock.mockResolvedValue(null);

        await expect(hasDuplicateTopupTransactionRef("ref-new")).resolves.toBe(false);
        expect(eqMock).toHaveBeenCalledWith(topups.transactionRef, "ref-new");
    });
});
