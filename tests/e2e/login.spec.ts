import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { config as loadEnv } from "dotenv";
import mysql from "mysql2/promise";
import { expect, test, type Page } from "@playwright/test";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env.development.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

const TEST_USERNAME = "snail1";
const TEST_PASSWORD = "snail1";

test.describe.configure({ mode: "serial" });

function usernameField(page: Page) {
  return page.locator("#username").first();
}

function passwordField(page: Page) {
  return page.locator("#password").first();
}

function submitButton(page: Page) {
  return page.locator("form").first().getByRole("button", { name: "เข้าสู่ระบบ" });
}

async function loginAsTestUser(page: Page, callbackUrl = "/dashboard") {
  await page.goto(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  await usernameField(page).fill(TEST_USERNAME);
  await passwordField(page).fill(TEST_PASSWORD);
  await submitButton(page).click();
}

async function expectSameOriginRootRedirect(page: Page, path: string) {
  const result = await page.evaluate(async (targetPath) => {
    const response = await fetch(targetPath, { credentials: "same-origin" });
    return {
      redirected: response.redirected,
      status: response.status,
      url: response.url,
    };
  }, path);

  expect(result.status).toBe(200);
  expect(result.redirected).toBe(true);

  const redirectUrl = new URL(result.url);
  expect(redirectUrl.origin).toBe(new URL(page.url()).origin);
  expect(redirectUrl.pathname).toBe("/");
}

async function ensureTestUser() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for login e2e tests");
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

  try {
    await connection.execute(
      `
        INSERT INTO \`User\` (id, username, email, password, role, name, emailVerified, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, 'USER', ?, true, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          password = VALUES(password),
          role = VALUES(role),
          name = VALUES(name),
          emailVerified = true,
          updatedAt = NOW()
      `,
      [
        randomUUID(),
        TEST_USERNAME,
        `${TEST_USERNAME}@example.com`,
        passwordHash,
        TEST_USERNAME,
      ]
    );
  } finally {
    await connection.end();
  }
}

test.beforeAll(async () => {
  await ensureTestUser();
});

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

test("login page renders the username/password form", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "เข้าสู่ระบบ" })).toBeVisible();
  await expect(usernameField(page)).toBeVisible();
  await expect(passwordField(page)).toBeVisible();
  await expect(submitButton(page)).toBeEnabled();
});

test("invalid credentials show a localized error", async ({ page }) => {
  await page.goto("/login");
  await usernameField(page).fill(`missing-${Date.now()}`);
  await passwordField(page).fill("wrong-password");
  await submitButton(page).click();

  await expect(page.locator(".swal2-title")).toContainText("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
  await expect(page).toHaveURL(/\/login/);
});

test("protected routes redirect guests to login with callbackUrl", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fdashboard/);
  await expect(page.getByRole("heading", { name: "เข้าสู่ระบบ" })).toBeVisible();
});

test("successful login redirects, survives reload, and blocks protected route after logout", async ({ page }) => {
  await loginAsTestUser(page);

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText(TEST_USERNAME).first()).toBeVisible();

  const sessionCookie = (await page.context().cookies())
    .find((cookie) => cookie.name.includes("authjs.session-token"));
  expect(sessionCookie).toBeDefined();
  expect(sessionCookie?.httpOnly).toBe(true);
  expect(sessionCookie?.sameSite).toBe("Lax");

  await page.reload();
  await expect(page).toHaveURL(/\/dashboard/);

  const bareLogoutResponse = await page.request.post("/api/logout");
  expect(bareLogoutResponse.status()).toBe(401);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard/);

  const csrfResponse = await page.request.get("/api/csrf");
  expect(csrfResponse.ok()).toBeTruthy();
  const csrfBody = await csrfResponse.json();
  const logoutResponse = await page.request.post("/api/logout", {
    headers: { "X-CSRF-Token": csrfBody.csrfToken },
  });
  expect(logoutResponse.ok()).toBeTruthy();

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fdashboard/);
});

test("malicious callbackUrl stays on the same origin", async ({ page }) => {
  await loginAsTestUser(page, "https://evil.example/dashboard");

  await expect(page).toHaveURL(/\/(welcome)?$/);
  expect(new URL(page.url()).origin).not.toBe("https://evil.example");
});

test("regular users cannot access admin pages or admin APIs", async ({ page }) => {
  await loginAsTestUser(page);
  await expect(page).toHaveURL(/\/dashboard/);

  await expectSameOriginRootRedirect(page, "/admin");

  const response = await page.request.get("/api/admin/audit-logs");
  expect(response.status()).toBe(403);
});
