import { test, expect } from "@playwright/test";
import { loginAndConsentUI } from "./helpers/auth";

const prefix = "/api/v1";

test.describe("Settings page UI", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndConsentUI(page);
  });

  test("Set, update and delete a provider API key", async ({ page }) => {
    await page.goto("/settings");

    const settingsRes = await page.request.get(`${prefix}/llm/provider_config_params`);
    const settings = await settingsRes.json();
    const [, provider] = Object.entries(settings).find(
      ([, value]) => (value as { config_parameters: unknown[] }).config_parameters.length > 0,
    ) as [string, { config_parameters: { key: string }[] }];
    const configKey = provider.config_parameters[0].key;

    await expect(page.getByTestId(`setting-status-${configKey}`)).toContainText(
      "Not set",
    );

    await page.getByTestId(`setting-set-value-button-${configKey}`).click();
    await page.getByTestId(`setting-value-input-${configKey}`).fill("sk-e2e-test-key");
    await page.getByTestId(`setting-save-button-${configKey}`).click();

    await expect(page.getByTestId(`setting-status-${configKey}`)).toContainText(
      "Key set",
    );

    await page.getByTestId(`setting-update-button-${configKey}`).click();
    await page.getByTestId(`setting-value-input-${configKey}`).fill("sk-e2e-updated-key");
    await page.getByTestId(`setting-save-button-${configKey}`).click();
    await expect(page.getByTestId(`setting-status-${configKey}`)).toContainText(
      "Key set",
    );

    await page.getByTestId(`setting-delete-button-${configKey}`).click();
    await page.getByTestId(`setting-confirm-delete-button-${configKey}`).click();
    await expect(page.getByTestId(`setting-status-${configKey}`)).toContainText(
      "Not set",
    );
  });

  test("Toggle research consent on the account tab", async ({ page }) => {
    await page.goto("/settings/account");

    const toggle = page.getByTestId("research-consent-switch");
    const initial = await toggle.getAttribute("aria-checked");

    await toggle.click();
    await expect(toggle).toHaveAttribute(
      "aria-checked",
      initial === "true" ? "false" : "true",
    );

    await page.reload();
    await expect(page.getByTestId("research-consent-switch")).toHaveAttribute(
      "aria-checked",
      initial === "true" ? "false" : "true",
    );
  });

  test("Delete account redirects to login", async ({ page }) => {
    await page.goto("/settings/account");

    await page.getByTestId("delete-account-button").click();
    await page.getByTestId("confirm-delete-account-button").click();

    await page.waitForURL(/\/login$/);
  });
});
