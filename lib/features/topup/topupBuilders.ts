import type {
    EasySlipBankVerifyData,
    EasySlipTrueWalletVerifyData,
} from "@/lib/features/topup/easySlipService";
import type { TopupVerifyTarget } from "@/lib/features/topup/slipHelpers";

export type TopupVerifyMethod = "payload" | "base64" | "url" | "image";
export type VerifiedTopupSlip =
    | { verifyTarget: "bank"; data: EasySlipBankVerifyData }
    | { verifyTarget: "truewallet"; data: EasySlipTrueWalletVerifyData };

export function getVerifiedTopupAmount(verifiedSlip: VerifiedTopupSlip) {
    return verifiedSlip.data.amountInSlip;
}

export function getVerifiedTopupTransactionRef(verifiedSlip: VerifiedTopupSlip) {
    return verifiedSlip.verifyTarget === "truewallet"
        ? verifiedSlip.data.rawSlip.transactionId
        : verifiedSlip.data.rawSlip.transRef;
}

export function getVerifiedTopupSenderName(verifiedSlip: VerifiedTopupSlip) {
    return verifiedSlip.verifyTarget === "truewallet"
        ? verifiedSlip.data.rawSlip.sender.name
        : verifiedSlip.data.rawSlip.sender.account.name.th ?? verifiedSlip.data.rawSlip.sender.account.name.en ?? null;
}

export function getVerifiedTopupSenderBank(verifiedSlip: VerifiedTopupSlip) {
    return verifiedSlip.verifyTarget === "truewallet"
        ? null
        : verifiedSlip.data.rawSlip.sender.bank.name;
}

export function getVerifiedTopupReceiverName(verifiedSlip: VerifiedTopupSlip) {
    return verifiedSlip.verifyTarget === "truewallet"
        ? verifiedSlip.data.rawSlip.receiver.name
        : verifiedSlip.data.rawSlip.receiver.account.name.th ?? verifiedSlip.data.rawSlip.receiver.account.name.en ?? null;
}

export function getVerifiedTopupReceiverBank(verifiedSlip: VerifiedTopupSlip) {
    return verifiedSlip.verifyTarget === "truewallet"
        ? verifiedSlip.data.matchedAccount?.bank.nameTh ?? null
        : verifiedSlip.data.rawSlip.receiver.bank.name;
}

export function buildPendingTopupInsert(input: {
    topupId: string;
    userId: string;
    requestedAmount: number;
    proofImage: string | null;
    createdAt: string;
}) {
    return {
        id: input.topupId,
        userId: input.userId,
        amount: String(input.requestedAmount),
        proofImage: input.proofImage,
        status: "PENDING",
        createdAt: input.createdAt,
    };
}

export function buildPendingTopupAudit(input: {
    topupId: string;
    requestedAmount: number;
    proofImage: string | null;
    verifyMethod: TopupVerifyMethod;
    verifyTarget: TopupVerifyTarget;
}) {
    return {
        resource: "TopupRequest",
        resourceId: input.topupId,
        resourceName: `฿${input.requestedAmount.toLocaleString("th-TH")}`,
        details: {
            amount: input.requestedAmount,
            proofImageStored: Boolean(input.proofImage),
            status: "PENDING",
            verification: "manual-review",
            verifyMethod: input.verifyMethod,
            verifyTarget: input.verifyTarget,
        },
    };
}

export function buildPendingTopupResponseData(input: {
    topupId: string;
    requestedAmount: number;
    proofImage: string | null;
}) {
    return {
        topupId: input.topupId,
        amount: input.requestedAmount,
        status: "PENDING",
        proofImage: input.proofImage,
    };
}

export function buildApprovedTopupInsert(input: {
    topupId: string;
    userId: string;
    verifiedSlip: VerifiedTopupSlip;
    verifiedAmount: number;
    proofImage: string | null;
    createdAt: string;
}) {
    return {
        id: input.topupId,
        userId: input.userId,
        amount: String(input.verifiedAmount),
        proofImage: input.proofImage,
        status: "APPROVED",
        transactionRef: getVerifiedTopupTransactionRef(input.verifiedSlip),
        senderName: getVerifiedTopupSenderName(input.verifiedSlip),
        senderBank: getVerifiedTopupSenderBank(input.verifiedSlip),
        receiverName: getVerifiedTopupReceiverName(input.verifiedSlip),
        receiverBank: getVerifiedTopupReceiverBank(input.verifiedSlip),
        createdAt: input.createdAt,
    };
}

export function buildApprovedTopupAudit(input: {
    topupId: string;
    requestedAmount: number;
    verifiedSlip: VerifiedTopupSlip;
    verifiedAmount: number;
    proofImage: string | null;
    verifyMethod: TopupVerifyMethod;
}) {
    return {
        resource: "TopupRequest",
        resourceId: input.topupId,
        resourceName: `฿${input.verifiedAmount.toLocaleString("th-TH")}`,
        details: {
            amount: input.verifiedAmount,
            requestedAmount: input.requestedAmount,
            transRef: getVerifiedTopupTransactionRef(input.verifiedSlip),
            proofImageStored: Boolean(input.proofImage),
            status: "APPROVED",
            verification: "easyslip-v2",
            verifyMethod: input.verifyMethod,
            verifyTarget: input.verifiedSlip.verifyTarget,
            isDuplicate: input.verifiedSlip.data.isDuplicate,
            isAmountMatched: input.verifiedSlip.data.isAmountMatched,
            matchedAccountFound: Boolean(input.verifiedSlip.data.matchedAccount),
        },
    };
}

export function buildApprovedTopupResponseData(input: {
    topupId: string;
    verifiedSlip: VerifiedTopupSlip;
    verifiedAmount: number;
    proofImage: string | null;
}) {
    return {
        topupId: input.topupId,
        amount: input.verifiedAmount,
        senderName: getVerifiedTopupSenderName(input.verifiedSlip),
        senderBank: getVerifiedTopupSenderBank(input.verifiedSlip),
        transRef: getVerifiedTopupTransactionRef(input.verifiedSlip),
        proofImage: input.proofImage,
        status: "APPROVED",
    };
}
