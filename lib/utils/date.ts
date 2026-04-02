/** Returns current datetime as MySQL-compatible string: "YYYY-MM-DD HH:MM:SS" */
export const mysqlNow = () => new Date().toISOString().slice(0, 19).replace("T", " ");

/**
 * MySQL datetime strings in this project are stored in UTC without an explicit
 * timezone marker. Convert them to ISO-8601 so browsers interpret them
 * consistently instead of treating them as local time.
 */
export function mysqlDateTimeToIso(value: string | null | undefined): string | null {
    if (!value) {
        return null;
    }

    if (value.includes("T")) {
        return /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`;
    }

    return `${value.replace(" ", "T")}Z`;
}
