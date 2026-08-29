/**
 * Every money column is DECIMAL(10,2), so a balance read back from MySQL is
 * exact but the JS number holding it is not: 0.07 * 3 is 0.21000000000000002,
 * and a customer with exactly ฿0.21 gets told they can't afford it.
 *
 * Display and storage already hide this — formatCurrencyAmount clamps to two
 * decimals and MySQL rounds on write — so the damage happens in between, when a
 * drifted total is *compared* against a balance or a minimum spend. Sum in whole
 * satang, compare in whole satang, and only convert back to baht at the edges.
 */

export const SATANG_PER_BAHT = 100;

/** Largest value a DECIMAL(10,2) column can hold. */
export const MAX_DECIMAL_AMOUNT = 99_999_999.99;

/** Baht (number, or the string MySQL hands back for a DECIMAL) to whole satang. */
export function toSatang(value: string | number | null | undefined) {
    const amount = Number(value ?? 0);
    if (!Number.isFinite(amount)) {
        return 0;
    }

    return Math.round(amount * SATANG_PER_BAHT);
}

export function toBaht(satang: number) {
    return satang / SATANG_PER_BAHT;
}

/** Adds amounts through satang so the total never carries binary drift. */
export function sumAmounts(values: Array<string | number | null | undefined>) {
    return toBaht(values.reduce<number>((sum, value) => sum + toSatang(value), 0));
}

/** Snaps one amount to the two decimals the column can actually store. */
export function roundAmount(value: string | number | null | undefined) {
    return toBaht(toSatang(value));
}
