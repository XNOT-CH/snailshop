import { describe, expect, it } from "vitest";
import {
    escapeCsvCell,
    getDateRangeError,
    getUnknownExportTableMessage,
    isAdminExportTable,
    isValidDateOnly,
    toCsvWithBOM,
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
