import { NextResponse } from "next/server";

export type GachaApiSuccessBody<TData> = {
    success: true;
    data: TData;
    message?: string;
};

export type GachaApiErrorBody = {
    success: false;
    message?: string;
};

interface GachaApiSuccessOptions {
    message?: string;
    status?: number;
}

interface GachaApiErrorOptions {
    status?: number;
}

export function gachaApiSuccess<TData>(
    data: TData,
    { message, status = 200 }: GachaApiSuccessOptions = {},
) {
    const body = {
        success: true,
        ...(message !== undefined ? { message } : {}),
        data,
    } satisfies GachaApiSuccessBody<TData>;

    return NextResponse.json(body, { status });
}

export function gachaApiError(
    message?: string,
    { status = 400 }: GachaApiErrorOptions = {},
) {
    const body = {
        success: false,
        ...(message !== undefined ? { message } : {}),
    } satisfies GachaApiErrorBody;

    return NextResponse.json(body, { status });
}
