import { describe, expect, it } from "vitest";
import {
    buildLocalizedCsv,
    escapeCsvCell,
    formatThaiDateTime,
    getDateRangeError,
    getUnknownExportTableMessage,
    isAdminExportTable,
    isValidDateOnly,
    toCsvWithBOM,
    type ExportColumn,
} from "@/lib/features/admin/exportData";

describe("lib/features/admin/exportData", () => {
    it("escapes CSV cells with the existing null, date, object, comma, newline, and quote behavior", () => {
        expect(escapeCsvCell(null)).toBe("");
        expect(escapeCsvCell(undefined)).toBe("");
        expect(escapeCsvCell(new Date("2026-05-07T01:02:03.000Z"))).toBe("2026-05-07T01:02:03.000Z");
        expect(escapeCsvCell({ name: "Alice" })).toBe('"{""name"":""Alice""}"');
        expect(escapeCsvCell("hello,world")).toBe('"hello,world"');
        expect(escapeCsvCell("hello\nworld")).toBe('"hello\nworld"');
        expect(escapeCsvCell('hello "world"')).toBe('"hello ""world"""');
    });

    it("builds CSV with UTF-8 BOM, header order, CRLF rows, and missing cells as empty strings", () => {
        const csv = toCsvWithBOM(
            [
                { id: "1", name: "Alice", note: "comma,value" },
                { id: "2", name: "Bob" },
            ],
            ["id", "name", "note"]
        );

        expect(csv.charCodeAt(0)).toBe(0xFEFF);
        expect(csv).toBe("\uFEFFid,name,note\r\n1,Alice,\"comma,value\"\r\n2,Bob,");
    });

    it("validates date-only params with the same route error messages", () => {
        expect(isValidDateOnly("2026-05-07")).toBe(true);
        expect(isValidDateOnly("2026-5-7")).toBe(false);
        expect(isValidDateOnly(null)).toBe(false);
        expect(getDateRangeError("bad", null)).toBe('Invalid "from" date. Use YYYY-MM-DD.');
        expect(getDateRangeError(null, "bad")).toBe('Invalid "to" date. Use YYYY-MM-DD.');
        expect(getDateRangeError("2026-05-08", "2026-05-07")).toBe('"from" date must be before or equal to "to" date.');
        expect(getDateRangeError("2026-05-07", "2026-05-07")).toBeNull();
    });

    it("neutralises CSV formula injection but leaves plain negative numbers intact", () => {
        expect(escapeCsvCell("=1+1")).toBe("'=1+1");
        expect(escapeCsvCell("@cmd")).toBe("'@cmd");
        expect(escapeCsvCell("+66812345678")).toBe("'+66812345678");
        expect(escapeCsvCell("-cmd|calc")).toBe("'-cmd|calc");
        // Plain numbers must stay numeric so spreadsheets can still sum them.
        expect(escapeCsvCell("-50")).toBe("-50");
        expect(escapeCsvCell("-50.25")).toBe("-50.25");
    });

    it("formats stored UTC datetimes in Bangkok time (no Buddhist-era year)", () => {
        // 20:00 UTC + 7h => next day 03:00 in Bangkok.
        expect(formatThaiDateTime("2026-03-14 20:00:00")).toBe("2026-03-15 03:00:00");
        expect(formatThaiDateTime("2026-07-13 05:30:00")).toBe("2026-07-13 12:30:00");
        expect(formatThaiDateTime(null)).toBe("");
        expect(formatThaiDateTime("")).toBe("");
    });

    it("builds a Thai-localised CSV with translated headers and values", () => {
        const columns: ExportColumn[] = [
            { key: "id", header: "รหัส" },
            { key: "active", header: "ใช้งาน", format: (value) => (value ? "ใช่" : "ไม่") },
            { key: "createdAt", header: "วันที่", format: formatThaiDateTime },
        ];
        const csv = buildLocalizedCsv(columns, [
            { id: "a1", active: true, createdAt: "2026-07-13 05:30:00" },
        ]);

        expect(csv.charCodeAt(0)).toBe(0xFEFF);
        expect(csv).toBe("﻿รหัส,ใช้งาน,วันที่\r\na1,ใช่,2026-07-13 12:30:00");
    });

    it("identifies supported export tables and keeps the route-compatible unknown table message", () => {
        expect(isAdminExportTable("orders")).toBe(true);
        expect(isAdminExportTable("users")).toBe(true);
        expect(isAdminExportTable("topups")).toBe(true);
        expect(isAdminExportTable("gacha")).toBe(true);
        expect(isAdminExportTable("products")).toBe(true);
        expect(isAdminExportTable("unknown_table")).toBe(false);
        expect(getUnknownExportTableMessage("unknown_table")).toBe(
            'Unknown table: "unknown_table". Use: orders, users, topups, gacha, products'
        );
    });
});
