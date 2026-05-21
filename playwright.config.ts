import { defineConfig, devices } from "@playwright/test";

const e2ePort = process.env.PLAYWRIGHT_PORT || "3201";
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${e2ePort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [["html"], ["list"]] : [["html"], ["list"]],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command:
          `node -e "process.env.E2E_AUTH_TEST_MODE='1';process.env.NEXT_PUBLIC_E2E_AUTH_TEST_MODE='1';process.env.PORT='${e2ePort}';import('./scripts/dev/run-next-dev.mjs')"`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
