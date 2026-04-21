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

function transformOptionalField<T extends Record<string, unknown>>(
    record: T,
    key: keyof T,
    transform: (value: string | null | undefined) => string | null,
) {
    if (!(key in record)) {
        return {};
    }

    return {
        [key]: transform(record[key] as string | null | undefined),
    };
}

export function encryptUserSensitiveFields<T extends Record<string, unknown>>(record: T): T {
    return {
        ...record,
        ...transformOptionalField(record, "taxFullName", encryptNullable),
        ...transformOptionalField(record, "taxPhone", encryptNullable),
        ...transformOptionalField(record, "taxAddress", encryptNullable),
        ...transformOptionalField(record, "taxProvince", encryptNullable),
        ...transformOptionalField(record, "taxDistrict", encryptNullable),
        ...transformOptionalField(record, "taxSubdistrict", encryptNullable),
        ...transformOptionalField(record, "taxPostalCode", encryptNullable),
        ...transformOptionalField(record, "shipFullName", encryptNullable),
        ...transformOptionalField(record, "shipPhone", encryptNullable),
        ...transformOptionalField(record, "shipAddress", encryptNullable),
        ...transformOptionalField(record, "shipProvince", encryptNullable),
        ...transformOptionalField(record, "shipDistrict", encryptNullable),
        ...transformOptionalField(record, "shipSubdistrict", encryptNullable),
        ...transformOptionalField(record, "shipPostalCode", encryptNullable),
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
