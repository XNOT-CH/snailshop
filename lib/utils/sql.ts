/**
 * Escapes LIKE wildcard characters (`%`, `_`) and the escape char (`\`) so a
 * user's search term is matched literally instead of being treated as a
 * pattern. MySQL uses `\` as the default LIKE escape character, so the escaped
 * value works with a plain `LIKE ${pattern}` (no explicit ESCAPE clause needed).
 */
export function escapeLikePattern(value: string): string {
    return value.replaceAll(/[\\%_]/g, (char) => `\\${char}`);
}
