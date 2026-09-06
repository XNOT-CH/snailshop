import { describe, expect, it, vi } from "vitest";

// proxy.ts builds a NextAuth instance at module scope; the CSP does not touch
// it, so stub it out rather than stand up real auth for a header assertion.
vi.mock("next-auth", () => ({
    default: () => ({ auth: vi.fn() }),
}));
vi.mock("@/auth.config", () => ({ authConfig: {} }));

const { buildCsp } = await import("@/proxy");

function directive(csp: string, name: string) {
    return csp
        .split("; ")
        .find((part) => part.startsWith(`${name} `));
}

describe("Content-Security-Policy", () => {
    it("carries the request nonce on script-src", () => {
        expect(directive(buildCsp("abc123"), "script-src")).toContain("'nonce-abc123'");
    });

    it("never allows inline script", () => {
        // This is the whole reason the CSP moved into the proxy. 'unsafe-inline'
        // here would let any injected markup execute, and it would fail silently
        // — the site keeps working, it just stops being protected.
        expect(directive(buildCsp("abc123"), "script-src")).not.toContain("'unsafe-inline'");
    });

    it("allows eval only outside production", async () => {
        // 'unsafe-eval' is what HMR and React Fast Refresh need. Shipping it
        // would undo much of the point of dropping 'unsafe-inline'.
        vi.stubEnv("NODE_ENV", "production");
        vi.resetModules();
        const prod = await import("@/proxy");

        expect(directive(prod.buildCsp("abc123"), "script-src")).not.toContain("'unsafe-eval'");

        vi.unstubAllEnvs();
        vi.resetModules();
    });

    it("keeps the directives that stop framing, plugins and base-tag hijacking", () => {
        const csp = buildCsp("abc123");

        expect(csp).toContain("object-src 'none'");
        expect(csp).toContain("base-uri 'self'");
        expect(csp).toContain("form-action 'self'");
        expect(csp).toContain("frame-ancestors 'self'");
        expect(csp).toContain("default-src 'self'");
    });
});
