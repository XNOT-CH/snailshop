import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { RESOURCE_LABELS } from "@/lib/auditLabels";

// A resource written to AuditLog with no label here renders as a raw English
// identifier on a Thai page — that was true for 10 of the 20 resource types in
// use. Pin both directions so neither a missing nor a dead label comes back.

function collectSources(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) collectSources(full, out);
        else if (/\.tsx?$/.test(entry.name)) out.push(readFileSync(full, "utf8"));
    }
    return out;
}

const SOURCES = ["app", "lib"].flatMap((dir) => collectSources(dir));

// Every `resource: "X"` passed to createAuditLog / auditFromRequest / auditUpdate.
// They are all string literals today; a computed value would silently not appear
// here, which the count guard below is meant to make noticeable.
const loggedResources = new Set<string>();
for (const src of SOURCES) {
    for (const match of src.matchAll(/resource:\s*"([^"]+)"/g)) {
        loggedResources.add(match[1]);
    }
}

describe("audit log resource labels", () => {
    it("finds the resources the codebase logs", () => {
        // Guards the scan itself: if this collapses, the assertions below prove nothing.
        expect(loggedResources.size).toBeGreaterThan(20);
    });

    it("labels every resource that gets logged", () => {
        const unlabelled = [...loggedResources].filter((resource) => !RESOURCE_LABELS[resource]);
        expect(unlabelled).toEqual([]);
    });

    it("has no label for a resource nothing logs", () => {
        const dead = Object.keys(RESOURCE_LABELS).filter((resource) => !loggedResources.has(resource));
        expect(dead).toEqual([]);
    });
});
