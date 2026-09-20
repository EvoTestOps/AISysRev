import { test, expect } from "@playwright/test";
import { loginAndConsentUI } from "./helpers/auth";
import { seedProjectWithPapers, uniqueName } from "./helpers/seed";

const prefix = "/api/v1";

test.describe("Job UI (mock LLM)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndConsentUI(page);
  });

  test("Create a zero-shot task with the mock provider and see it complete", async ({
    page,
  }) => {
    const { project } = await seedProjectWithPapers(
      page.request,
      uniqueName("UI Job Project"),
      2,
    );

    await page.goto(`/project/${project.uuid}`);

    await page.getByTestId("llm-provider-dropdown").click();
    await page.getByTestId("llm-provider-dropdown-option-mock").click();

    await page.getByTestId("llm-model-dropdown").click();
    await page.getByTestId("llm-model-dropdown-option-mock-small").click();

    await page.getByTestId("prompting-strategy-zero-shot-button").click();

    const createButton = page.getByTestId("create-task-button");
    await expect(createButton).toBeEnabled();
    await createButton.click();

    let jobUuid: string | undefined;
    await expect
      .poll(async () => {
        const jobsRes = await page.request.get(`${prefix}/job?project=${project.uuid}`);
        const jobs = await jobsRes.json();
        jobUuid = jobs[0]?.uuid;
        return jobs.length;
      })
      .toBe(1);

    await expect(page.getByTestId(`job-status-${jobUuid}`)).toContainText("Done", {
      timeout: 30000,
    });

    await expect(page.getByTestId("start-manual-evaluation-button")).toBeVisible();
  });
});
