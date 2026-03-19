import { test, expect } from "@playwright/test";

test("unauthenticated /dashboard redirects to /login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("/login page loads and shows email input", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("#email")).toBeVisible();
});
