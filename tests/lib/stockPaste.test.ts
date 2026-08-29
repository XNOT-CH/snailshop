import { describe, it, expect } from "vitest";
import { formatStockEntry, parseStockPaste } from "@/lib/stock";

describe("parseStockPaste", () => {
    it("reads one account per line and keeps the line number", () => {
        const result = parseStockPaste("player001 / pass1\nplayer002 / pass2");

        expect(result.items).toEqual([
            { line: 1, user: "player001", pass: "pass1" },
            { line: 2, user: "player002", pass: "pass2" },
        ]);
        expect(result.problems).toEqual([]);
    });

    // People paste whatever their source gave them, so the separator is detected
    // rather than configured.
    it("accepts the separators a pasted list actually arrives with", () => {
        const result = parseStockPaste(
            [
                "a1 / passA",
                "b2:passB",
                "c3,passC",
                "d4|passD",
                "e5 | passE",
                "f6\tpassF",
                "g7 passG",
            ].join("\n")
        );

        expect(result.items.map((item) => `${item.user}=${item.pass}`)).toEqual([
            "a1=passA",
            "b2=passB",
            "c3=passC",
            "d4=passD",
            "e5=passE",
            "f6=passF",
            "g7=passG",
        ]);
    });

    // " / " is what this app writes, so it has to win over characters that can
    // legitimately appear inside a password.
    it("prefers the app's own separator over characters inside the password", () => {
        const result = parseStockPaste("player001 / pa:ss,word|1");

        expect(result.items).toEqual([{ line: 1, user: "player001", pass: "pa:ss,word|1" }]);
    });

    it("skips blank lines without shifting the reported line numbers", () => {
        const result = parseStockPaste("\n\nplayer001 / pass1\n\nplayer002 / pass2\n");

        expect(result.items.map((item) => item.line)).toEqual([3, 5]);
    });

    it("reports a line with no password instead of adding half an account", () => {
        const result = parseStockPaste("player001 / pass1\nplayer002");

        expect(result.items).toHaveLength(1);
        expect(result.problems).toEqual([
            { line: 2, raw: "player002", reason: "missing-pass" },
        ]);
    });

    it("keeps the first of a repeated user and reports the rest", () => {
        const result = parseStockPaste("player001 / first\nplayer001 / second");

        expect(result.items).toEqual([{ line: 1, user: "player001", pass: "first" }]);
        expect(result.problems).toEqual([
            { line: 2, raw: "player001 / second", reason: "duplicate", user: "player001" },
        ]);
    });

    it("returns nothing for empty input", () => {
        expect(parseStockPaste("   \n\n")).toEqual({ items: [], problems: [] });
    });
});

describe("formatStockEntry", () => {
    it("writes the shape splitStock and getStockUser expect", () => {
        expect(formatStockEntry("  player001 ", " pass1 ")).toBe("player001 / pass1");
    });
});
