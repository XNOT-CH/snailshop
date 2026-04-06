import { decrypt, encrypt } from "@/lib/encryption";

function encryptNullable(value: string | null | undefined) {
    if (!value) {
        return null;
    }

    return encrypt(value);
}

function decryptNullable(value: string | null | undefined) {
    if (!value) {
        return null;
    }

    return decrypt(value);
}

export function encryptUserSensitiveFields<T extends Record<string, unknown>>(record: T): T {
    return {
        ...record,
        taxFullName: encryptNullable(record.taxFullName as string | null | undefined),
        taxPhone: encryptNullable(record.taxPhone as string | null | undefined),
        taxAddress: encryptNullable(record.taxAddress as string | null | undefined),
        taxProvince: encryptNullable(record.taxProvince as string | null | undefined),
        taxDistrict: encryptNullable(record.taxDistrict as string | null | undefined),
        taxSubdistrict: encryptNullable(record.taxSubdistrict as string | null | undefined),
        taxPostalCode: encryptNullable(record.taxPostalCode as string | null | undefined),
        shipFullName: encryptNullable(record.shipFullName as string | null | undefined),
        shipPhone: encryptNullable(record.shipPhone as string | null | undefined),
        shipAddress: encryptNullable(record.shipAddress as string | null | undefined),
        shipProvince: encryptNullable(record.shipProvince as string | null | undefined),
        shipDistrict: encryptNullable(record.shipDistrict as string | null | undefined),
        shipSubdistrict: encryptNullable(record.shipSubdistrict as string | null | undefined),
        shipPostalCode: encryptNullable(record.shipPostalCode as string | null | undefined),
    };
}

export function decryptUserSensitiveFields<T extends Record<string, unknown>>(record: T): T {
    return {
        ...record,
        taxFullName: decryptNullable(record.taxFullName as string | null | undefined),
        taxPhone: decryptNullable(record.taxPhone as string | null | undefined),
        taxAddress: decryptNullable(record.taxAddress as string | null | undefined),
        taxProvince: decryptNullable(record.taxProvince as string | null | undefined),
        taxDistrict: decryptNullable(record.taxDistrict as string | null | undefined),
        taxSubdistrict: decryptNullable(record.taxSubdistrict as string | null | undefined),
        taxPostalCode: decryptNullable(record.taxPostalCode as string | null | undefined),
        shipFullName: decryptNullable(record.shipFullName as string | null | undefined),
        shipPhone: decryptNullable(record.shipPhone as string | null | undefined),
        shipAddress: decryptNullable(record.shipAddress as string | null | undefined),
        shipProvince: decryptNullable(record.shipProvince as string | null | undefined),
        shipDistrict: decryptNullable(record.shipDistrict as string | null | undefined),
        shipSubdistrict: decryptNullable(record.shipSubdistrict as string | null | undefined),
        shipPostalCode: decryptNullable(record.shipPostalCode as string | null | undefined),
    };
}

export function encryptTopupSensitiveFields<T extends Record<string, unknown>>(record: T): T {
    return {
        ...record,
        proofImage: encryptNullable(record.proofImage as string | null | undefined),
        senderName: encryptNullable(record.senderName as string | null | undefined),
        receiverName: encryptNullable(record.receiverName as string | null | undefined),
        receiverBank: encryptNullable(record.receiverBank as string | null | undefined),
    };
}

export function decryptTopupSensitiveFields<T extends Record<string, unknown>>(record: T): T {
    return {
        ...record,
        proofImage: decryptNullable(record.proofImage as string | null | undefined),
        senderName: decryptNullable(record.senderName as string | null | undefined),
        receiverName: decryptNullable(record.receiverName as string | null | undefined),
        receiverBank: decryptNullable(record.receiverBank as string | null | undefined),
    };
}
