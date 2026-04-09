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

export function parseMockDateKey(value: string | null | undefined): string | null {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return null;
    }

    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    const isValid =
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day;

    return isValid ? value : null;
}

export function buildThaiDateAtCurrentTime(mockDateKey: string, baseNow: Date = new Date()): Date {
    const [year, month, day] = mockDateKey.split("-").map(Number);
    const timeFormatter = new Intl.DateTimeFormat("en", {
        timeZone: TH_TIME_ZONE,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });
    const parts = timeFormatter.formatToParts(baseNow);
    const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
    const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
    const second = Number(parts.find((part) => part.type === "second")?.value ?? "0");

    return new Date(Date.UTC(year, month - 1, day, hour - 7, minute, second));
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
