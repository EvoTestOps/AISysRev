import { test, expect, Page } from "@playwright/test";
import { loginAndConsentUI } from "./helpers/auth";
import { seedProjectWithPapers, uniqueName } from "./helpers/seed";

const prefix = "/api/v1";

const FORCE_ZDR_SETTING = "openrouter_force_zdr";
const FORCE_ZDR_TOGGLE = `setting_${FORCE_ZDR_SETTING}_toggle`;
const ZDR_JOB_SWITCH = "property_zdr_input";
const FORCED_MESSAGE = "Forced on by your global provider settings.";

const STUB_MODEL = {
  id: "e2e/stub-model",
  created: 0,
  object: "model",
  owned_by: "e2e",
};

async function resetForceZdr(page: Page): Promise<void> {
  const res = await page.request.delete(
    `${prefix}/setting?name=${FORCE_ZDR_SETTING}`,
  );
  expect([200, 404], "force ZDR setting should be reset").toContain(res.status());
}

async function setForceZdr(page: Page, enabled: boolean): Promise<void> {
  const res = await page.request.post(`${prefix}/setting`, {
    data: { name: FORCE_ZDR_SETTING, value: String(enabled), secret: false },
  });
  expect(res.status(), "force ZDR setting should be saved").toBe(201);
}

async function getForceZdr(page: Page): Promise<string | null> {
  const res = await page.request.get(`${prefix}/setting?name=${FORCE_ZDR_SETTING}`);
  if (res.status() === 404) return null;
  expect(res.status()).toBe(200);
  return (await res.json()).value;
}

type FormGuard = {
  /** provider_parameters of every OpenRouter model listing request, in order. */
  modelListRequests: Array<Record<string, unknown>>;
  /** Job creation requests that were attempted (and blocked). */
  blockedJobCreations: string[];
};

/**
 * These tests only inspect the job creation form and must never create a task,
 * because that would call the LLM. So:
 *  - the OpenRouter model listing is stubbed (nothing leaves the test stack,
 *    no API key needed), and its request bodies are recorded;
 *  - any attempt to create a job is aborted and recorded.
 */
async function guardJobForm(page: Page): Promise<FormGuard> {
  const guard: FormGuard = { modelListRequests: [], blockedJobCreations: [] };

  await page.route(/\/api\/v1\/llm\/openrouter\/models$/, async (route) => {
    const body = route.request().postDataJSON() ?? {};
    guard.modelListRequests.push(body.provider_parameters ?? {});
    await route.fulfill({ status: 200, json: [STUB_MODEL] });
  });

  await page.route(/\/api\/v1\/job(\?.*)?$/, async (route) => {
    if (route.request().method() === "POST") {
      guard.blockedJobCreations.push(route.request().url());
      await route.abort();
      return;
    }
    await route.fallback();
  });

  return guard;
}

/**
 * Serves the provider endpoints (used by the job form and the Settings page)
 * with a different default for the force ZDR config parameter, as if the server
 * declared `defaultValue=<value>` for it.
 */
async function stubForceZdrDefault(page: Page, value: boolean): Promise<void> {
  await page.route(
    /\/api\/v1\/llm\/(providers|provider_config_params)$/,
    async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      // /providers is a list, /provider_config_params a map keyed by provider.
      const providers = Array.isArray(body) ? body : Object.values(body);
      for (const provider of providers as Array<{
        config_parameters: Array<{ key: string; defaultValue?: unknown }>;
      }>) {
        for (const param of provider.config_parameters) {
          if (param.key === FORCE_ZDR_SETTING) param.defaultValue = value;
        }
      }
      await route.fulfill({ response, json: body });
    },
  );
}

async function seedProject(page: Page): Promise<string> {
  const { project } = await seedProjectWithPapers(
    page.request,
    uniqueName("ZDR Project"),
    1,
  );
  return project.uuid;
}

async function openProjectPage(page: Page, projectUuid?: string): Promise<string> {
  const uuid = projectUuid ?? (await seedProject(page));
  await page.goto(`/project/${uuid}`);
  return uuid;
}

async function selectProvider(page: Page, provider: string): Promise<void> {
  await page.getByTestId("llm-provider-dropdown").click();
  await page.getByTestId(`llm-provider-dropdown-option-${provider}`).click();
}

/** Provider parameters live in a collapsed <details> ("Advanced"). */
async function openAdvancedProviderConfig(page: Page): Promise<void> {
  await page
    .locator("details", { has: page.getByTestId(ZDR_JOB_SWITCH) })
    .locator("summary")
    .click();
}

async function expectNoJobCreated(
  page: Page,
  guard: FormGuard,
  projectUuid: string,
): Promise<void> {
  expect(guard.blockedJobCreations, "no job creation should be attempted").toEqual([]);
  const jobsRes = await page.request.get(`${prefix}/job?project=${projectUuid}`);
  expect(await jobsRes.json(), "no job should exist for the project").toEqual([]);
}

test.describe("Zero data retention (ZDR)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndConsentUI(page);
    await resetForceZdr(page);
  });

  test.afterEach(async ({ page }) => {
    await resetForceZdr(page);
  });

  test.describe("Force ZDR setting", () => {
    test("Switch toggles on and off and each state persists", async ({ page }) => {
      await page.goto("/settings");
      const toggle = page.getByTestId(FORCE_ZDR_TOGGLE);

      await expect(toggle).toHaveAttribute("aria-checked", "false");

      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-checked", "true");
      await expect.poll(() => getForceZdr(page)).toBe("true");

      await page.reload();
      await expect(page.getByTestId(FORCE_ZDR_TOGGLE)).toHaveAttribute(
        "aria-checked",
        "true",
      );

      await page.getByTestId(FORCE_ZDR_TOGGLE).click();
      await expect(page.getByTestId(FORCE_ZDR_TOGGLE)).toHaveAttribute(
        "aria-checked",
        "false",
      );
      await expect.poll(() => getForceZdr(page)).toBe("false");

      await page.reload();
      await expect(page.getByTestId(FORCE_ZDR_TOGGLE)).toHaveAttribute(
        "aria-checked",
        "false",
      );
    });

    test("Switch shows the default on a fresh login and a user's change overwrites it", async ({
      page,
    }) => {
      await stubForceZdrDefault(page, true);
      await page.goto("/settings");
      const toggle = page.getByTestId(FORCE_ZDR_TOGGLE);

      // Nothing saved yet, so the switch shows the default.
      expect(await getForceZdr(page)).toBeNull();
      await expect(toggle).toHaveAttribute("aria-checked", "true");

      // The user's choice is saved and wins over the default from then on.
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-checked", "false");
      await expect.poll(() => getForceZdr(page)).toBe("false");

      await page.reload();
      await expect(page.getByTestId(FORCE_ZDR_TOGGLE)).toHaveAttribute(
        "aria-checked",
        "false",
      );
    });
  });

  test.describe("Job creation form (OpenRouter)", () => {
    test("Per-job ZDR switch is free to toggle when ZDR is not forced", async ({
      page,
    }) => {
      const guard = await guardJobForm(page);
      const projectUuid = await openProjectPage(page);

      await selectProvider(page, "openrouter");
      await openAdvancedProviderConfig(page);

      const zdrSwitch = page.getByTestId(ZDR_JOB_SWITCH);
      await expect(zdrSwitch).toBeEnabled();
      await expect(zdrSwitch).toHaveAttribute("aria-checked", "false");
      await expect(page.getByText(FORCED_MESSAGE)).toHaveCount(0);
      // Let the initial model fetch settle: a late response would otherwise race
      // the re-fetch that toggling triggers.
      await expect(page.getByTestId("llm-model-dropdown")).toBeVisible();
      // An unset toggle is not an error: only secrets (API keys) must be set.
      await expect(
        page.getByTestId(`error-missing-${FORCE_ZDR_SETTING}`),
      ).toHaveCount(0);

      await zdrSwitch.click();
      await expect(zdrSwitch).toHaveAttribute("aria-checked", "true");
      // The chosen value is what the model list is requested with.
      await expect
        .poll(() => guard.modelListRequests.at(-1)?.zdr)
        .toBe(true);

      await zdrSwitch.click();
      await expect(zdrSwitch).toHaveAttribute("aria-checked", "false");
      await expect(zdrSwitch).toBeEnabled();

      await expectNoJobCreated(page, guard, projectUuid);
    });

    test("Forced ZDR is shown as on and locked when creating a task", async ({
      page,
    }) => {
      await setForceZdr(page, true);
      const guard = await guardJobForm(page);
      const projectUuid = await openProjectPage(page);

      await selectProvider(page, "openrouter");
      await openAdvancedProviderConfig(page);

      const zdrSwitch = page.getByTestId(ZDR_JOB_SWITCH);
      await expect(zdrSwitch).toHaveAttribute("aria-checked", "true");
      await expect(zdrSwitch).toBeDisabled();
      await expect(page.getByText(FORCED_MESSAGE)).toBeVisible();

      // Not asserting on the model-list request body here: the form can request
      // models before the forced value is applied. The server applies the forced
      // setting itself (see test_011_openrouter_provider.py).
      await expect(page.getByTestId("llm-model-dropdown")).toBeVisible();

      // The task is ready to be created, and the forced state is still shown.
      await page.getByTestId("llm-model-dropdown").click();
      await page
        .getByTestId(`llm-model-dropdown-option-${STUB_MODEL.id}`)
        .click();
      await expect(page.getByTestId("create-task-button")).toBeEnabled();
      await expect(zdrSwitch).toHaveAttribute("aria-checked", "true");
      await expect(zdrSwitch).toBeDisabled();
      await expect(page.getByText(FORCED_MESSAGE)).toBeVisible();

      // Deliberately not clicking "Create task": that would call the LLM.
      await expectNoJobCreated(page, guard, projectUuid);
    });

    test("Forced ZDR follows the Settings page switch", async ({ page }) => {
      const guard = await guardJobForm(page);
      const projectUuid = await seedProject(page);

      // Only navigate away from a page once it has settled (its session check
      // is done): Firefox/WebKit abort that in-flight request on unload, which
      // the app treats as "logged out" and redirects to /login.
      await page.goto("/settings");
      await page.getByTestId(FORCE_ZDR_TOGGLE).click();
      await expect(page.getByTestId(FORCE_ZDR_TOGGLE)).toHaveAttribute(
        "aria-checked",
        "true",
      );

      await openProjectPage(page, projectUuid);
      await selectProvider(page, "openrouter");
      await openAdvancedProviderConfig(page);
      await expect(page.getByTestId(ZDR_JOB_SWITCH)).toHaveAttribute(
        "aria-checked",
        "true",
      );
      await expect(page.getByTestId(ZDR_JOB_SWITCH)).toBeDisabled();
      await expect(page.getByText(FORCED_MESSAGE)).toBeVisible();

      await page.goto("/settings");
      await page.getByTestId(FORCE_ZDR_TOGGLE).click();
      await expect(page.getByTestId(FORCE_ZDR_TOGGLE)).toHaveAttribute(
        "aria-checked",
        "false",
      );

      await openProjectPage(page, projectUuid);
      await selectProvider(page, "openrouter");
      await openAdvancedProviderConfig(page);
      await expect(page.getByTestId(ZDR_JOB_SWITCH)).toHaveAttribute(
        "aria-checked",
        "false",
      );
      await expect(page.getByTestId(ZDR_JOB_SWITCH)).toBeEnabled();
      await expect(page.getByText(FORCED_MESSAGE)).toHaveCount(0);

      await expectNoJobCreated(page, guard, projectUuid);
    });

    test("ZDR is forced by default when the setting's default is on", async ({
      page,
    }) => {
      await stubForceZdrDefault(page, true);
      const guard = await guardJobForm(page);
      const projectUuid = await openProjectPage(page);

      await selectProvider(page, "openrouter");
      await openAdvancedProviderConfig(page);

      // The user never saved the setting, so the default applies.
      expect(await getForceZdr(page)).toBeNull();
      await expect(page.getByTestId(ZDR_JOB_SWITCH)).toHaveAttribute(
        "aria-checked",
        "true",
      );
      await expect(page.getByTestId(ZDR_JOB_SWITCH)).toBeDisabled();
      await expect(page.getByText(FORCED_MESSAGE)).toBeVisible();

      await expectNoJobCreated(page, guard, projectUuid);
    });

    test("An explicit setting beats an on-by-default ZDR", async ({ page }) => {
      await stubForceZdrDefault(page, true);
      await setForceZdr(page, false);
      const guard = await guardJobForm(page);
      const projectUuid = await openProjectPage(page);

      await selectProvider(page, "openrouter");
      await openAdvancedProviderConfig(page);

      await expect(page.getByTestId(ZDR_JOB_SWITCH)).toHaveAttribute(
        "aria-checked",
        "false",
      );
      await expect(page.getByTestId(ZDR_JOB_SWITCH)).toBeEnabled();
      await expect(page.getByText(FORCED_MESSAGE)).toHaveCount(0);

      await expectNoJobCreated(page, guard, projectUuid);
    });

    test("Forcing ZDR does not affect other providers", async ({ page }) => {
      await setForceZdr(page, true);
      const guard = await guardJobForm(page);
      const projectUuid = await openProjectPage(page);

      await selectProvider(page, "mock");
      // The mock provider's own parameters are rendered, but it has no ZDR switch.
      await expect(page.getByTestId("property_delay_input")).toHaveCount(1);
      await expect(page.getByTestId(ZDR_JOB_SWITCH)).toHaveCount(0);
      await expect(page.getByText(FORCED_MESSAGE)).toHaveCount(0);

      await expectNoJobCreated(page, guard, projectUuid);
    });
  });
});
