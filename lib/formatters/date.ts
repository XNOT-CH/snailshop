import { mysqlDateTimeToIso, TH_TIME_ZONE } from "@/lib/utils/date";

export const THAI_DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"] as const;

export const THAI_MONTHS = [
    "มกราคม",
    "กุมภาพันธ์",
    "มีนาคม",
    "เมษายน",
    "พฤษภาคม",
    "มิถุนายน",
    "กรกฎาคม",
    "สิงหาคม",
    "กันยายน",
    "ตุลาคม",
    "พฤศจิกายน",
    "ธันวาคม",
] as const;

export const THAI_MONTHS_SHORT = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
] as const;

export function getThaiDateParts(date: Date) {
    const day = THAI_DAYS[date.getDay()];
    const d = date.getDate();
    const month = THAI_MONTHS[date.getMonth()];
    const monthShort = THAI_MONTHS_SHORT[date.getMonth()];
    const year = date.getFullYear() + 543;
    return { day, d, month, monthShort, year };
}

export function formatThaiDateLong(date: Date) {
    return date.toLocaleDateString("th-TH", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

export function formatThaiDateShort(value: string | Date) {
    const date = value instanceof Date
        ? value
        : new Date(mysqlDateTimeToIso(value) ?? value);

    return date.toLocaleDateString("th-TH", {
        timeZone: TH_TIME_ZONE,
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}
