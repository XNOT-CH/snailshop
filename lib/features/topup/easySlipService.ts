export const EASYSLIP_V2_BASE_URL = "https://api.easyslip.com/v2";
export const EASYSLIP_V2_INFO_URL = `${EASYSLIP_V2_BASE_URL}/info`;
export const EASYSLIP_V2_VERIFY_BANK_URL = `${EASYSLIP_V2_BASE_URL}/verify/bank`;
export const EASYSLIP_V2_VERIFY_TRUEWALLET_URL = `${EASYSLIP_V2_BASE_URL}/verify/truewallet`;

const EASYSLIP_API_KEY_ENV = "EASYSLIP_API_KEY";

export interface EasySlipV2Error {
    code: string;
    message: string;
}

export interface EasySlipV2SuccessResponse<TData> {
    success: true;
    data: TData;
    message: string;
}

export interface EasySlipV2ErrorResponse {
    success: false;
    error: EasySlipV2Error;
}

export type EasySlipV2Response<TData> = EasySlipV2SuccessResponse<TData> | EasySlipV2ErrorResponse;

export interface EasySlipV2RequestResult<TData> {
    status: number;
    response: EasySlipV2Response<TData>;
}

export interface EasySlipMatchedAccount {
    bank: {
        nameTh: string;
        nameEn: string;
        code: string;
        shortCode: string;
    };
    nameTh: string;
    nameEn: string;
    type: "PERSONAL" | "JURISTIC";
    bankNumber: string;
}

export interface EasySlipBankParty {
    bank: {
        id: string;
        name: string;
        short: string;
    };
    account: {
        name: {
            th?: string;
            en?: string;
        };
        bank?: {
            type: "BANKAC" | "TOKEN" | "DUMMY";
            account: string;
        };
        proxy?: {
            type: "NATID" | "MSISDN" | "EWALLETID" | "EMAIL" | "BILLERID";
            account: string;
        };
    };
}

export interface EasySlipBankRawSlip {
    payload: string;
    transRef: string;
    date: string;
    countryCode: string;
    amount: {
        amount: number;
        local: {
            amount: number;
            currency: string;
        };
    };
    fee: number;
    ref1: string;
    ref2: string;
    ref3: string;
    sender: EasySlipBankParty;
    receiver: EasySlipBankParty & { merchantId?: string | null };
}

export interface EasySlipBankVerifyData {
    remark?: string;
    isDuplicate: boolean;
    matchedAccount: EasySlipMatchedAccount | null;
    amountInOrder?: number;
    amountInSlip: number;
    isAmountMatched?: boolean;
    rawSlip: EasySlipBankRawSlip;
}

export interface EasySlipTrueWalletRawSlip {
    transactionId: string;
    date: string;
    amount: number;
    sender: {
        name: string;
    };
    receiver: {
        name: string;
        phone: string;
    };
}

export interface EasySlipTrueWalletVerifyData {
    remark?: string;
    isDuplicate: boolean;
    matchedAccount: EasySlipMatchedAccount | null;
    amountInOrder?: number;
    amountInSlip: number;
    isAmountMatched?: boolean;
    rawSlip: EasySlipTrueWalletRawSlip;
}

export interface EasySlipInfoData {
    application: {
        name: string;
        autoRenew: {
            expired: boolean;
            quota: boolean;
            createdAt: string;
            expiresAt: string;
        };
        quota: {
            used: number;
            max: number | null;
            remaining: number | null;
            totalUsed: number;
        };
    };
    branch: {
        name: string;
        isActive: boolean;
        quota: {
            used: number;
            totalUsed: number;
        };
    };
    account: {
        email: string;
        credit: number;
    };
    product: {
        name: string;
    };
}

export interface EasySlipV2VerifyOptions {
    remark?: string;
    matchAccount?: boolean;
    matchAmount?: number;
    checkDuplicate?: boolean;
}

export type EasySlipBankVerifyInput =
    | ({ payload: string } & EasySlipV2VerifyOptions)
    | ({ image: File } & EasySlipV2VerifyOptions)
    | ({ base64: string } & EasySlipV2VerifyOptions)
    | ({ url: string } & EasySlipV2VerifyOptions);

export type EasySlipTrueWalletVerifyInput =
    | ({ image: File } & EasySlipV2VerifyOptions)
    | ({ base64: string } & EasySlipV2VerifyOptions)
    | ({ url: string } & EasySlipV2VerifyOptions);

function getEasySlipApiKey() {
    const apiKey = process.env[EASYSLIP_API_KEY_ENV]?.trim();
    if (!apiKey) {
        throw new Error(`${EASYSLIP_API_KEY_ENV} is not configured.`);
    }

    return apiKey;
}

function appendEasySlipFormOption(formData: FormData, key: keyof EasySlipV2VerifyOptions, value: unknown) {
    if (value === undefined || value === null || value === "") {
        return;
    }

    formData.append(key, typeof value === "boolean" ? String(value) : String(value));
}

function buildEasySlipJsonBody(input: EasySlipBankVerifyInput | EasySlipTrueWalletVerifyInput) {
    const body: Record<string, string | number | boolean> = {};

    if ("payload" in input) body.payload = input.payload;
    if ("base64" in input) body.base64 = input.base64;
    if ("url" in input) body.url = input.url;
    if (input.remark) body.remark = input.remark;
    if (typeof input.matchAccount === "boolean") body.matchAccount = input.matchAccount;
    if (typeof input.matchAmount === "number") body.matchAmount = input.matchAmount;
    if (typeof input.checkDuplicate === "boolean") body.checkDuplicate = input.checkDuplicate;

    return body;
}

function buildEasySlipImageFormData(input: { image: File } & EasySlipV2VerifyOptions) {
    const formData = new FormData();
    formData.append("image", input.image, input.image.name || "slip");
    appendEasySlipFormOption(formData, "remark", input.remark);
    appendEasySlipFormOption(formData, "matchAccount", input.matchAccount);
    appendEasySlipFormOption(formData, "matchAmount", input.matchAmount);
    appendEasySlipFormOption(formData, "checkDuplicate", input.checkDuplicate);

    return formData;
}

async function requestEasySlipV2<TData>(
    url: string,
    init: RequestInit,
): Promise<EasySlipV2RequestResult<TData>> {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${getEasySlipApiKey()}`);

    const response = await fetch(url, {
        ...init,
        headers,
    });

    return {
        status: response.status,
        response: await response.json() as EasySlipV2Response<TData>,
    };
}

export async function getEasySlipInfo(): Promise<EasySlipV2RequestResult<EasySlipInfoData>> {
    return requestEasySlipV2<EasySlipInfoData>(EASYSLIP_V2_INFO_URL, {
        method: "GET",
    });
}

export async function verifyBankSlipWithEasySlipV2(
    input: EasySlipBankVerifyInput,
): Promise<EasySlipV2RequestResult<EasySlipBankVerifyData>> {
    if ("image" in input) {
        return requestEasySlipV2<EasySlipBankVerifyData>(EASYSLIP_V2_VERIFY_BANK_URL, {
            method: "POST",
            body: buildEasySlipImageFormData(input),
        });
    }

    return requestEasySlipV2<EasySlipBankVerifyData>(EASYSLIP_V2_VERIFY_BANK_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(buildEasySlipJsonBody(input)),
    });
}

export async function verifyTrueWalletSlipWithEasySlipV2(
    input: EasySlipTrueWalletVerifyInput,
): Promise<EasySlipV2RequestResult<EasySlipTrueWalletVerifyData>> {
    if ("image" in input) {
        return requestEasySlipV2<EasySlipTrueWalletVerifyData>(EASYSLIP_V2_VERIFY_TRUEWALLET_URL, {
            method: "POST",
            body: buildEasySlipImageFormData(input),
        });
    }

    return requestEasySlipV2<EasySlipTrueWalletVerifyData>(EASYSLIP_V2_VERIFY_TRUEWALLET_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(buildEasySlipJsonBody(input)),
    });
}
