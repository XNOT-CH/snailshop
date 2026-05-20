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
