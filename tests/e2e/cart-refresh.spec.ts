import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { config as loadEnv } from "dotenv";
import mysql, { type Connection } from "mysql2/promise";
import { expect, test, type Page } from "@playwright/test";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env.development.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

const CART_STORAGE_KEY = "gamestore_cart";
const TEST_USERNAME = "cart_refresh_e2e";
const TEST_PASSWORD = "cart_refresh_e2e";
const TEST_PRODUCT_ID = "00000000-0000-4000-8000-cartrefresh1";

test.describe.configure({ mode: "serial" });
test.skip(
    Boolean(process.env.PLAYWRIGHT_BASE_URL) && process.env.E2E_AUTH_TEST_MODE !== "1",
    "This checkout flow needs the Playwright-managed auth test server.",
);

function usernameField(page: Page) {
    return page.locator("#username").first();
}

function passwordField(page: Page) {
    return page.locator("#password").first();
}

function submitButton(page: Page) {
    return page.locator("form").first().getByRole("button", { name: "เข้าสู่ระบบ" });
}

async function createConnection() {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is required for cart refresh e2e tests");
    }

    return mysql.createConnection(process.env.DATABASE_URL);
}

async function ensureTestUser(connection: Connection) {
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    await connection.execute(
        `
            INSERT INTO \`User\` (id, username, email, password, role, name, emailVerified, creditBalance, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, 'USER', ?, true, '0.00', NOW(), NOW())
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
        ],
    );
}

async function ensureTestProduct(connection: Connection) {
    await connection.execute(
        `
            INSERT INTO \`Product\` (
                id, name, description, price, discountPrice, imageUrl, category, currency,
                secretData, stockSeparator, stockCount, isSold, isFeatured, sortOrder,
                createdAt, updatedAt
            )
            VALUES (?, ?, '', '150.00', NULL, '/placeholder.jpg', 'e2e', 'THB', ?, 'newline', 3, false, false, 0, NOW(), NOW())
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                price = VALUES(price),
                discountPrice = VALUES(discountPrice),
                imageUrl = VALUES(imageUrl),
                category = VALUES(category),
                currency = VALUES(currency),
                secretData = VALUES(secretData),
                stockSeparator = VALUES(stockSeparator),
                stockCount = VALUES(stockCount),
                isSold = VALUES(isSold),
                isFeatured = VALUES(isFeatured),
                updatedAt = NOW()
        `,
        [
            TEST_PRODUCT_ID,
            "Cart Refresh E2E Product",
            "stock-code-1\nstock-code-2\nstock-code-3",
        ],
    );
}

async function loginAsCartTestUser(page: Page) {
    await page.goto(`/login?callbackUrl=${encodeURIComponent("/home")}`);
    await usernameField(page).fill(TEST_USERNAME);
    await passwordField(page).fill(TEST_PASSWORD);
    await submitButton(page).click();
    await expect(page).toHaveURL(/\/home/);
}

test.beforeAll(async () => {
    const connection = await createConnection();
    try {
        await ensureTestUser(connection);
        await ensureTestProduct(connection);
    } finally {
        await connection.end();
    }
});

test.afterAll(async () => {
    if (!process.env.DATABASE_URL) {
        return;
    }

    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    try {
        await connection.execute("DELETE FROM `Product` WHERE id = ?", [TEST_PRODUCT_ID]);
    } finally {
        await connection.end();
    }
});

test.beforeEach(async ({ context }) => {
    await context.clearCookies();
});

test("cart checkout refreshes stale local item data before showing PIN prompt", async ({ page }) => {
    await loginAsCartTestUser(page);

    await page.evaluate(
        ({ key, productId }) => {
            localStorage.setItem(key, JSON.stringify([
                {
                    id: productId,
                    name: "Cart Refresh E2E Product",
                    price: 100,
                    discountPrice: null,
                    currency: "THB",
                    imageUrl: "/placeholder.jpg",
                    category: "e2e",
                    quantity: 1,
                    stock: 3,
                },
            ]));
        },
        { key: CART_STORAGE_KEY, productId: TEST_PRODUCT_ID },
    );

    await page.goto("/home");
    await page.getByRole("button", { name: "ตะกร้าสินค้า (1 รายการ)" }).click();
    await expect(page.getByText("Cart Refresh E2E Product")).toBeVisible();
    await expect(page.getByText("฿100")).toBeVisible();

    await page.getByRole("button", { name: "ชำระเงิน 1 รายการ" }).click();

    await expect(page.locator(".swal2-title")).toContainText("ราคาหรือข้อมูลสินค้ามีการอัปเดต");
    await expect(page.locator("#swal-pin-input")).toHaveCount(0);

    const storedCart = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "[]"), CART_STORAGE_KEY);
    expect(storedCart).toHaveLength(1);
    expect(storedCart[0]).toMatchObject({
        id: TEST_PRODUCT_ID,
        price: 150,
        quantity: 1,
        stock: 3,
    });
});
