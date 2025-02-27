import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page, context }) => {
  // To skip disclaimer
  await context.addCookies([
    { name: "disclaimer_read", value: "true", path: "/", domain: "localhost" },
  ]);
  await page.goto("/");
});

test("Has correct title", async ({ page }) => {
  await expect(page).toHaveTitle(/AI-automated screening PoC/);
});

test("Adding inclusion criteria works", async ({ page }) => {
  await page
    .getByTestId("inclusion-criteria-input")
    .fill("Example inclusion criteria 1");
  await page.getByTestId("inclusion-criteria-input").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("inclusion-criteria-1")).toBeVisible();
  await expect(page.getByTestId("inclusion-criteria-1-text")).toBeVisible();
  await expect(page.getByTestId("inclusion-criteria-1-text")).toHaveText(
    "Example inclusion criteria 1"
  );

  await page
    .getByTestId("inclusion-criteria-input")
    .fill("Example inclusion criteria 2");
  await page.getByTestId("inclusion-criteria-input").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("inclusion-criteria-2")).toBeVisible();
  await expect(page.getByTestId("inclusion-criteria-2-text")).toBeVisible();
  await expect(page.getByTestId("inclusion-criteria-2-text")).toHaveText(
    "Example inclusion criteria 2"
  );
});
