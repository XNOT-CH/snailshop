import { expect, test } from "@playwright/test";

test("homepage loads and renders a title", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/.+/);
  await expect(page.locator("body")).toBeVisible();
});
