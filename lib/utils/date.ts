/** Returns current datetime as MySQL-compatible string: "YYYY-MM-DD HH:MM:SS" */
export const mysqlNow = () => new Date().toISOString().slice(0, 19).replace("T", " ");

export const TH_TIME_ZONE = "Asia/Bangkok";

function getDatePartsInTimeZone(date: Date, timeZone: string = TH_TIME_ZONE) {
    const formatter = new Intl.DateTimeFormat("en", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });

    const parts = formatter.formatToParts(date);
    const year = parts.find((part) => part.type === "year")?.value ?? "0000";
    const month = parts.find((part) => part.type === "month")?.value ?? "01";
    const day = parts.find((part) => part.type === "day")?.value ?? "01";

    return { year, month, day };
}

export function formatDateInTimeZone(date: Date, timeZone: string = TH_TIME_ZONE): string {
    const { year, month, day } = getDatePartsInTimeZone(date, timeZone);
    return `${year}-${month}-${day}`;
}

export function getFirstDayOfMonthInTimeZone(date: Date, timeZone: string = TH_TIME_ZONE): string {
    const { year, month } = getDatePartsInTimeZone(date, timeZone);
    return `${year}-${month}-01`;
}

/**
 * MySQL datetime strings in this project are stored in UTC without an explicit
 * timezone marker. Convert them to ISO-8601 so browsers interpret them
 * consistently instead of treating them as local time.
 */
export function mysqlDateTimeToIso(value: string | Date | null | undefined): string | null {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    if (value.includes("T")) {
        return /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`;
    }

    return `${value.replace(" ", "T")}Z`;
}
