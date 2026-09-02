import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const API_DIR = path.join(process.cwd(), "app", "api");
const ADMIN_CLIENT_DIRS = [
    path.join(process.cwd(), "app", "(site)", "admin"),
    path.join(process.cwd(), "components", "admin"),
];

const CSRF_GUARDS = [
    "isAuthenticatedWithCsrf",
    "isAdminWithCsrf",
    "requirePermissionWithCsrf",
    "requireAnyPermissionWithCsrf",
    "validateCsrfRequest",
    "validateCsrfToken",
];

const INTENTIONAL_NO_CSRF_ROUTES = new Set([
    "app/api/auth/forgot-password/route.ts:POST",
    "app/api/auth/reset-password/route.ts:POST",
    "app/api/cart/refresh/route.ts:POST",
    "app/api/promo-codes/validate/route.ts:POST",
    "app/api/register/route.ts:POST",
    "app/api/session/route.ts:POST",
    "app/api/session/route.ts:DELETE",
    "app/api/user/settings/route.ts:PATCH",
]);

function listFiles(dir: string, predicate: (file: string) => boolean): string[] {
    if (!fs.existsSync(dir)) return [];

    const files: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...listFiles(fullPath, predicate));
        } else if (predicate(fullPath)) {
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

        handlers.push({ method, body: source.slice(openIndex, closeIndex + 1) });
    }

    return handlers;
}

function relativeFile(file: string) {
    return path.relative(process.cwd(), file).replaceAll(path.sep, "/");
}

function findMatchingParen(source: string, openIndex: number) {
    let depth = 0;
    for (let index = openIndex; index < source.length; index++) {
        if (source[index] === "(") depth++;
        if (source[index] === ")") depth--;
        if (depth === 0) return index;
    }
    return -1;
}

describe("mutation CSRF coverage", () => {
    it("keeps user-facing state-changing routes on CSRF-aware auth unless explicitly allowlisted", () => {
        const missingCsrf = listFiles(API_DIR, (file) => file.endsWith(`${path.sep}route.ts`)).flatMap((file) => {
            const source = fs.readFileSync(file, "utf8");
            return getMutationHandlers(source)
                .filter((handler) => !CSRF_GUARDS.some((guard) => handler.body.includes(guard)))
                .map((handler) => `${relativeFile(file)}:${handler.method}`)
                .filter((routeKey) => !INTENTIONAL_NO_CSRF_ROUTES.has(routeKey));
        });

        expect(missingCsrf).toEqual([]);
    });

    it("uses fetchWithCsrf for admin client-side mutation requests", () => {
        const rawMutationFetches = ADMIN_CLIENT_DIRS
            .flatMap((dir) => listFiles(dir, (file) => file.endsWith(".tsx")))
            .flatMap((file) => {
                const source = fs.readFileSync(file, "utf8");
                const matches = [...source.matchAll(/(?<!WithCsrf)\bfetch\s*\(/g)];
                return matches
                    .filter((match) => {
                        const openIndex = source.indexOf("(", match.index);
                        const closeIndex = findMatchingParen(source, openIndex);
                        if (closeIndex === -1) {
                            throw new Error(`Could not parse fetch call in ${relativeFile(file)}`);
                        }

                        const fetchCall = source.slice(match.index, closeIndex + 1);
                        return /method:\s*["'](POST|PUT|PATCH|DELETE)["']/.test(fetchCall)
                            || fetchCall.includes("/api/admin/auto-delete/run");
                    })
                    .map((match) => `${relativeFile(file)}:${source.slice(0, match.index).split("\n").length}`);
            });

        expect(rawMutationFetches).toEqual([]);
    });
});
