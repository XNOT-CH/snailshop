/**
 * Stock management utilities
 * Handles splitting secretData into individual stock items based on separator
 */

export type StockSeparatorType = "newline" | "doubleline" | "triple-dash" | "custom";

export const SEPARATOR_OPTIONS: { value: StockSeparatorType; label: string; description: string; delimiter: string }[] = [
    { value: "newline", label: "บรรทัดใหม่", description: "แยกแต่ละรายการด้วยการขึ้นบรรทัดใหม่ 1 บรรทัด", delimiter: "\n" },
];

/**
 * Get the actual delimiter string from separator type
 */
export function getDelimiter(separatorType: string): string {
    const option = SEPARATOR_OPTIONS.find(o => o.value === separatorType);
    return option?.delimiter || "\n";
}

/**
 * Split secretData into individual stock items
 */
export function splitStock(secretData: string, separatorType: string): string[] {
    if (!secretData?.trim()) return [];
    const delimiter = getDelimiter(separatorType);
    return secretData.split(delimiter).filter(item => item.trim() !== "");
}

export function getStockUser(stockItem: string): string {
    return stockItem.split(" / ")[0]?.trim() || "";
}

export function findDuplicateStockUser(secretData: string, separatorType: string): string | null {
    const seenUsers = new Set<string>();

    for (const item of splitStock(secretData, separatorType)) {
        const user = getStockUser(item);
        if (!user) continue;
        if (seenUsers.has(user)) return user;
        seenUsers.add(user);
    }

    return null;
}

/**
 * Get stock count from secretData
 */
export function getStockCount(secretData: string, separatorType: string): number {
    return splitStock(secretData, separatorType).length;
}

/**
 * Take the first stock item and return [takenItem, remainingData]
 */
export function takeFirstStock(secretData: string, separatorType: string): [string | null, string] {
    const items = splitStock(secretData, separatorType);
    if (items.length === 0) return [null, ""];
    
    const takenItem = items[0];
    const remaining = items.slice(1);
    const delimiter = getDelimiter(separatorType);
    
    return [takenItem, remaining.join(delimiter)];
}

/**
 * Join stock items back into secretData
 */
export function joinStock(items: string[], separatorType: string): string {
    const delimiter = getDelimiter(separatorType);
    return items.join(delimiter);
}

/**
 * Pasted stock, one account per line. The separator between user and pass is
 * detected per line rather than configured: people paste whatever their source
 * gave them, and `stockSeparator` in the database only ever means "one account
 * per line" (SEPARATOR_OPTIONS has no other entry).
 *
 * Order matters — " / " is the shape this app writes itself, so it wins before
 * the looser delimiters that could appear inside a password.
 */
const STOCK_PASTE_DELIMITERS = [" / ", "	", " | ", "|", ":", ",", " "];

export interface ParsedStockLine {
    line: number;
    user: string;
    pass: string;
}

export interface StockPasteProblem {
    line: number;
    raw: string;
    reason: "missing-pass" | "duplicate";
    user?: string;
}

export interface StockPasteResult {
    items: ParsedStockLine[];
    problems: StockPasteProblem[];
}

function splitPastedLine(raw: string): { user: string; pass: string } {
    for (const delimiter of STOCK_PASTE_DELIMITERS) {
        const index = raw.indexOf(delimiter);
        if (index > 0) {
            return {
                user: raw.slice(0, index).trim(),
                pass: raw.slice(index + delimiter.length).trim(),
            };
        }
    }

    return { user: raw.trim(), pass: "" };
}

export function parseStockPaste(text: string): StockPasteResult {
    const items: ParsedStockLine[] = [];
    const problems: StockPasteProblem[] = [];
    const seenUsers = new Set<string>();

    text.split(/\r?\n/).forEach((rawLine, index) => {
        const raw = rawLine.trim();
        if (!raw) return;

        const line = index + 1;
        const { user, pass } = splitPastedLine(raw);

        if (!user || !pass) {
            problems.push({ line, raw, reason: "missing-pass" });
            return;
        }

        if (seenUsers.has(user)) {
            problems.push({ line, raw, reason: "duplicate", user });
            return;
        }

        seenUsers.add(user);
        items.push({ line, user, pass });
    });

    return { items, problems };
}

/** The one place that decides how a user/pass pair is written into secretData. */
export function formatStockEntry(user: string, pass: string): string {
    return `${user.trim()} / ${pass.trim()}`;
}
