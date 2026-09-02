import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CACHE_KEYS } from "@/lib/cache";

// A key that something reads through cacheOrFetch but nothing ever invalidates
// is a silent staleness bug: the admin saves, the site keeps the old value until
// the TTL expires. That shipped twice — FOOTER_WIDGET/FOOTER_LINKS, then
// NAV_ITEMS/PRODUCT_CATEGORIES — so pin it here instead of finding it a third time.

function collectSources(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) collectSources(full, out);
        else if (/\.tsx?$/.test(entry.name)) out.push(readFileSync(full, "utf8"));
    }
    return out;
}

const SOURCES = ["app", "lib", "components"].flatMap((dir) => collectSources(dir));

// True when `CACHE_KEYS.<key>` appears inside the argument list of a `fnName(` call.
function keyIsUsedWith(fnName: string, key: string) {
    const needle = `CACHE_KEYS.${key}`;
    const opener = `${fnName}(`;
    return SOURCES.some((src) => {
        let from = 0;
        for (;;) {
            const at = src.indexOf(needle, from);
            if (at === -1) return false;
            // The call opener sits just before the key, within the same argument list.
            const window = src.slice(Math.max(0, at - 400), at);
            const call = window.lastIndexOf(opener);
            if (call !== -1 && !window.slice(call).includes(")")) return true;
            from = at + needle.length;
        }
    });
}

describe("cache invalidation coverage", () => {
    const cachedKeys = Object.keys(CACHE_KEYS).filter((key) => keyIsUsedWith("cacheOrFetch", key));

    it("finds the keys that are actually cached", () => {
        // Guards the scan itself: if this drops to 0 the test below proves nothing.
        expect(cachedKeys.length).toBeGreaterThan(5);
    });

    it.each(cachedKeys)("%s is invalidated somewhere", (key) => {
        expect(keyIsUsedWith("invalidateCache", key)).toBe(true);
    });
});
