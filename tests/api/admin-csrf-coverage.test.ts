import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ADMIN_API_DIR = path.join(process.cwd(), "app", "api", "admin");
const ADMIN_ACCESS_FILE = path.join(process.cwd(), "lib", "adminAccess.ts");
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const CSRF_GUARDS = [
    "requirePermissionWithCsrf",
    "requireAnyPermissionWithCsrf",
    "isAdminWithCsrf",
];
const ADMIN_API_FALLBACK_ROUTE = "/api/admin";

function listRouteFiles(dir: string): string[] {
    const files: string[] = [];

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...listRouteFiles(fullPath));
        } else if (entry.name === "route.ts") {
            files.push(fullPath);
        }
    }

    return files;
}

function findMatchingBrace(source: string, openIndex: number) {
    let depth = 0;

    for (let index = openIndex; index < source.length; index++) {
        if (source[index] === "{") depth++;
        if (source[index] === "}") depth--;
        if (depth === 0) return index;
    }

    return -1;
}

function getMutationHandlers(source: string) {
    const handlers: Array<{ method: string; body: string }> = [];
    const handlerPattern = /export\s+async\s+function\s+(POST|PUT|PATCH|DELETE|GET|HEAD|OPTIONS)\s*\([^)]*\)\s*\{/g;
    let match: RegExpExecArray | null;

    while ((match = handlerPattern.exec(source))) {
        const method = match[1];
        if (!MUTATION_METHODS.has(method)) continue;

        const openIndex = match.index + match[0].lastIndexOf("{");
        const closeIndex = findMatchingBrace(source, openIndex);
        if (closeIndex === -1) {
            throw new Error(`Could not parse ${method} handler body`);
        }

        handlers.push({
            method,
            body: source.slice(openIndex, closeIndex + 1),
        });
    }

    return handlers;
}

function routePathFromFile(file: string) {
    return path
        .relative(path.join(process.cwd(), "app", "api", "admin"), file)
        .replaceAll(path.sep, "/")
        .replace(/\/route\.ts$/, "")
        .replace(/\/\[[^\]]+\]/g, "/x")
        .replace(/^/, "/api/admin/")
        .replace(/\/$/, "");
}

function getAdminApiRulePaths() {
    const source = fs.readFileSync(ADMIN_ACCESS_FILE, "utf8");
    return [...source.matchAll(/\{ path: "([^"]+)", permission: PERMISSIONS\.[A-Z0-9_]+/g)]
        .map((match) => match[1])
        .filter((routePath) => routePath.startsWith(ADMIN_API_FALLBACK_ROUTE));
}

describe("admin API CSRF coverage", () => {
    it("requires CSRF-aware auth for every admin mutation route", () => {
        const missingCsrf = listRouteFiles(ADMIN_API_DIR).flatMap((file) => {
            const source = fs.readFileSync(file, "utf8");
            return getMutationHandlers(source)
                .filter((handler) => !CSRF_GUARDS.some((guard) => handler.body.includes(guard)))
                .map((handler) => `${path.relative(process.cwd(), file)}:${handler.method}`);
        });

        expect(missingCsrf).toEqual([]);
    });

    it("does not rely only on the broad admin API fallback rule", () => {
        const rulePaths = getAdminApiRulePaths();
        const fallbackOnlyRoutes = listRouteFiles(ADMIN_API_DIR)
            .map(routePathFromFile)
            .filter((routePath) => {
                const matchedRule = rulePaths.find((rulePath) =>
                    routePath === rulePath || routePath.startsWith(rulePath)
                );

                return matchedRule === ADMIN_API_FALLBACK_ROUTE;
            });

        expect(fallbackOnlyRoutes).toEqual([]);
    });
});
