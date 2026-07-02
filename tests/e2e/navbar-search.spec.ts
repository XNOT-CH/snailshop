import { expect, test, type Page } from "@playwright/test";

// Smoke coverage for the navbar product search (NavbarSearch): the trigger
// button, the ⌘K/Ctrl+K shortcut, and the search dialog. Kept data-agnostic —
// the e2e DB may hold zero products, so we assert on the dialog behaviour, not
// on specific results.
//
// The homepage lives at "/" with the navbar, but first-time visitors (no
// welcome cookie) get client-redirected to the immersive /welcome page, which
// has no navbar — so mark the welcome splash as already seen before each test.

const SEARCH_PLACEHOLDER = "ค้นหาสินค้าตามชื่อหรือหมวดหมู่...";

test.beforeEach(async ({ page, baseURL }) => {
  await page.context().addCookies([
    { name: "snail_welcome_seen", value: "1", url: baseURL ?? "http://127.0.0.1:3201" },
  ]);
});

function searchTrigger(page: Page) {
  return page.getByRole("button", { name: "ค้นหาสินค้า" });
}

function searchInput(page: Page) {
  return page.getByPlaceholder(SEARCH_PLACEHOLDER);
}

test("navbar search opens from the trigger button and can be dismissed", async ({ page }) => {
  await page.goto("/");

  await searchTrigger(page).click();
  await expect(searchInput(page)).toBeVisible();

  // Escape closes the dialog.
  await page.keyboard.press("Escape");
  await expect(searchInput(page)).toBeHidden();
});

test("Ctrl+K toggles the search dialog", async ({ page }) => {
  await page.goto("/");

  // Wait for the trigger to render before firing the shortcut — the ⌘K/Ctrl+K
  // key listener is only attached once NavbarSearch has hydrated. Move focus
  // onto the trigger so the keydown has a concrete in-document target to
  // bubble from up to the document-level listener.
  await searchTrigger(page).focus();

  await page.keyboard.press("Control+k");
  await expect(searchInput(page)).toBeVisible();

  // The shortcut toggles, so pressing it again closes the dialog.
  await page.keyboard.press("Control+k");
  await expect(searchInput(page)).toBeHidden();
});

test("typing a nonsense query surfaces the empty-result state", async ({ page }) => {
  await page.goto("/");

  await searchTrigger(page).click();
  await searchInput(page).fill("zzz-no-such-product-xyz");

  // Either the request failed, or it succeeded and nothing matched — both are
  // valid, non-crashing outcomes. We only guarantee the list did not render a
  // stray product row for a query that cannot match anything.
  await expect(
    page.getByText(/ไม่พบสินค้าที่ค้นหา|โหลดรายการสินค้าไม่สำเร็จ|ยังไม่มีสินค้า/),
  ).toBeVisible();
});
