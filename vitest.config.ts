import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

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
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      reportsDirectory: "./coverage",
      include: ["lib/**/*.ts", "components/**/*.tsx", "app/**/*.ts", "app/**/*.tsx"],
      exclude: [
        "**/*.d.ts",
        "**/node_modules/**",
        "lib/db.ts",
        "lib/redis.ts",
        "lib/cubejs.ts",
        "lib/mail.ts",
      ],
    },
  },
});
