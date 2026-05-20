import {
    createSlipProxy,
    getImageExtension,
    mapEasySlipV2Error,
    type EasySlipV2VerifyInput,
    type EasySlipVerifyTarget,
} from "@/lib/features/topup/slipHelpers";

const EASYSLIP_API_URL = "https://developer.easyslip.com/api/v1/verify";
const EASYSLIP_V2_VERIFY_BANK_URL = "https://api.easyslip.com/v2/verify/bank";
const EASYSLIP_V2_VERIFY_TRUEWALLET_URL = "https://api.easyslip.com/v2/verify/truewallet";
const TRUEWALLET_BANK = {
    id: "TRUEMONEYWALLET",
    name: "TrueMoney Wallet",
    short: "TRUEWALLET",
};

export interface SlipPartyInfo {
    bank: { id?: string; name?: string; short?: string };
    account: {
        name: { th?: string; en?: string };
        bank?: { type?: string; account?: string };
        proxy?: { type?: string; account?: string };
    };
}

export interface SlipVerificationData {
    payload: string;
    transRef: string;
    date: string;
    countryCode: string;
    amount: {
        amount: number;
        local: { amount?: number; currency?: string };
    };
    fee?: number;
    ref1?: string;
    ref2?: string;
    ref3?: string;
    sender: SlipPartyInfo;
    receiver: SlipPartyInfo & { merchantId?: string | null };
}

export interface SlipVerificationResult {
    status: number;
    message?: string;
    data?: SlipVerificationData;
}

interface EasySlipV2Response {
    success: boolean;
    data?: {
        remark?: string;
        isDuplicate?: boolean;
        matchedAccount?: {
            bank?: {
                nameTh?: string;
                nameEn?: string;
                code?: string;
                shortCode?: string;
            };
            nameTh?: string;
            nameEn?: string;
            type?: "PERSONAL" | "JURISTIC";
            bankNumber?: string;
        } | null;
        amountInOrder?: number;
        amountInSlip?: number;
        isAmountMatched?: boolean;
        rawSlip?: {
            payload: string;
            transRef: string;
            date: string;
            countryCode: string;
            amount: {
                amount: number;
                local: { amount?: number; currency?: string };
            };
            fee?: number;
            ref1?: string;
            ref2?: string;
            ref3?: string;
            sender?: SlipPartyInfo;
            receiver?: SlipPartyInfo & { merchantId?: string | null };
        };
    };
    error?: {
        code?: string;
        message?: string;
    };
    message?: string;
}

interface EasySlipV2TrueWalletResponse {
    success: boolean;
    data?: {
        remark?: string;
        isDuplicate?: boolean;
        matchedAccount?: {
            bank?: {
                nameTh?: string;
                nameEn?: string;
                code?: string;
                shortCode?: string;
            };
            nameTh?: string;
            nameEn?: string;
            type?: "PERSONAL" | "JURISTIC";
            bankNumber?: string;
        } | null;
        amountInOrder?: number;
        amountInSlip?: number;
        isAmountMatched?: boolean;
        rawSlip?: {
            transactionId: string;
            date: string;
            amount: number;
            sender?: {
                name?: string;
            };
            receiver?: {
                name?: string;
                phone?: string;
            };
        };
    };
    error?: {
        code?: string;
        message?: string;
    };
    message?: string;
}

export async function verifySlipWithEasySlip(file: File): Promise<SlipVerificationResult> {
    const token = process.env.EASYSLIP_TOKEN;
    if (!token) {
        throw new Error("EASYSLIP_NOT_CONFIGURED");
    }

    const extension = getImageExtension(file.type);

    const formData = new FormData();
    formData.append("file", file, `slip.${extension}`);
    formData.append("checkDuplicate", "true");

    const response = await fetch(EASYSLIP_API_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: formData,
    });

    return response.json() as Promise<SlipVerificationResult>;
}

export async function verifySlipWithEasySlipV2(
    input: EasySlipV2VerifyInput,
    target: EasySlipVerifyTarget = "bank",
): Promise<SlipVerificationResult> {
    const apiKey = process.env.EASYSLIP_API_KEY;
    if (!apiKey) {
        throw new Error("EASYSLIP_V2_NOT_CONFIGURED");
    }

    if (target === "truewallet" && "payload" in input) {
        return {
            status: 400,
            message: "TrueMoney Wallet does not support payload verification",
        };
    }

    let response: Response;
    const endpoint = target === "truewallet"
        ? EASYSLIP_V2_VERIFY_TRUEWALLET_URL
        : EASYSLIP_V2_VERIFY_BANK_URL;

    if ("image" in input) {
        const formData = new FormData();
        formData.append("image", input.image, input.image.name || "slip");
        formData.append("matchAccount", "true");
        formData.append("checkDuplicate", "true");
        if (typeof input.expectedAmount === "number" && Number.isFinite(input.expectedAmount) && input.expectedAmount > 0) {
            formData.append("matchAmount", String(input.expectedAmount));
        }
        if (input.remark) {
            formData.append("remark", input.remark);
        }

        response = await fetch(endpoint, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
            body: formData,
        });
    } else {
        const requestBody: Record<string, unknown> = {
            matchAccount: true,
            checkDuplicate: true,
        };

        if ("payload" in input) requestBody.payload = input.payload;
        if ("base64" in input) requestBody.base64 = input.base64;
        if ("url" in input) requestBody.url = input.url;
        if (typeof input.expectedAmount === "number" && Number.isFinite(input.expectedAmount) && input.expectedAmount > 0) {
            requestBody.matchAmount = input.expectedAmount;
        }
        if (input.remark) {
            requestBody.remark = input.remark;
        }

        response = await fetch(endpoint, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
        });
    }

    const result = await response.json() as EasySlipV2Response | EasySlipV2TrueWalletResponse;

    if (!result.success) {
        return {
            status: response.status,
            message: mapEasySlipV2Error(result.error?.code, result.error?.message),
        };
    }

    if (target === "truewallet") {
        const walletResult = result as EasySlipV2TrueWalletResponse;
        const slip = walletResult.data?.rawSlip;
        if (!slip?.transactionId) {
            return {
                status: 400,
                message: "ข้อมูลสลิปไม่สมบูรณ์",
            };
        }

        return {
            status: 200,
            message: walletResult.message,
            data: {
                payload: "",
                transRef: slip.transactionId,
                date: slip.date,
                countryCode: "TH",
                amount: {
                    amount: slip.amount,
                    local: {
                        amount: slip.amount,
                        currency: "THB",
                    },
                },
                sender: {
                    bank: TRUEWALLET_BANK,
                    account: {
                        name: {
                            th: slip.sender?.name,
                        },
                    },
                },
                receiver: {
                    bank: TRUEWALLET_BANK,
                    account: {
                        name: {
                            th: slip.receiver?.name,
                        },
                        proxy: createSlipProxy(slip.receiver?.phone),
                    },
                },
            },
        };
    }

    const slip = (result as EasySlipV2Response).data?.rawSlip;
    if (!slip?.transRef) {
        return {
            status: 400,
            message: "ข้อมูลสลิปไม่สมบูรณ์",
        };
    }

    return {
        status: 200,
        message: result.message,
        data: {
            payload: slip.payload,
            transRef: slip.transRef,
            date: slip.date,
            countryCode: slip.countryCode,
            amount: slip.amount,
            fee: slip.fee,
            ref1: slip.ref1,
            ref2: slip.ref2,
            ref3: slip.ref3,
            sender: slip.sender ?? { bank: {}, account: { name: {} } },
            receiver: slip.receiver ?? { bank: {}, account: { name: {} } },
        },
    };
}
