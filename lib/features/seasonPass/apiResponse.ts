import { NextResponse } from "next/server";

export type SeasonPassApiErrorBody = {
    success: false;
    message?: string;
};

interface SeasonPassApiErrorOptions {
    status?: number;
}

export function seasonPassApiError(
    message?: string,
    { status = 400 }: SeasonPassApiErrorOptions = {},
) {
    const body = {
        success: false,
        ...(message !== undefined ? { message } : {}),
    } satisfies SeasonPassApiErrorBody;

    return NextResponse.json(body, { status });
}
