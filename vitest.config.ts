import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    // The first test in a file pays for the dynamic import of the route under
    // test and its whole dependency graph: ~200-500ms idle, but it grows with
    // CPU contention and blew past the 5s default whenever the suite ran
    // alongside a build or an install. Every test that is not paying that
    // import cost finishes in 1-16ms, so 20s still catches a real hang.
    testTimeout: 20_000,
    hookTimeout: 20_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      reportsDirectory: "./coverage",
      include: ["lib/**/*.ts", "app/api/**/*.ts"],
      exclude: [
        "**/*.d.ts",
        "**/node_modules/**",
        "lib/db/**",
        "lib/redis.ts",
        "lib/cubejs.ts",
        "lib/mail.ts",
      ],
    },
  },
});
