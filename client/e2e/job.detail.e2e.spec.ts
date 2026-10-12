import { test, expect } from "@playwright/test";
import { loginAndConsentUI } from "./helpers/auth";
import { createZeroShotMockJob, waitForJobCompletion } from "./helpers/job";
import { seedProjectWithPapers, uniqueName } from "./helpers/seed";

test.describe("Job detail pages (mock LLM)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndConsentUI(page);
  });

  test("Open a task's papers, then a paper's result and prompt", async ({ page }) => {
    const { project } = await seedProjectWithPapers(
      page.request,
      uniqueName("Job Detail Project"),
      2,
    );
    const job = await createZeroShotMockJob(page.request, project.uuid);
    await waitForJobCompletion(page.request, job.uuid);

    await page.goto(`/project/${project.uuid}`);
    await page.getByTestId(`job-card-link-${job.uuid}`).click();
    await page.waitForURL(`**/project/${project.uuid}/job/${job.uuid}`);

    const rows = page.locator('[data-testid^="job-task-row-"]');
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toHaveAttribute("data-testid", "job-task-row-1");

    // Expand the first paper and open its result.
    await rows.nth(0).locator("button").first().click();
    await page.getByTestId("job-task-open-1").click();

    await expect(page.getByTestId("task-title")).toHaveText("Seeded Paper 1");
    await expect(page.getByTestId("task-overall-decision")).toContainText("Include");
    await expect(page.getByTestId("task-criterion-IC1")).toBeVisible();
    await expect(page.getByTestId("task-criterion-EC1")).toBeVisible();

    const prompt = page.getByTestId("task-prompt-0");
    await prompt.locator("summary").click();
    await expect(prompt).toContainText("Seeded Paper 1");

    await page.getByTestId("task-next").click();
    await expect(page.getByTestId("task-title")).toHaveText("Seeded Paper 2");
    await expect(page.getByTestId("task-next")).toBeDisabled();

    await page.getByTestId("task-back").click();
    await page.waitForURL(`**/project/${project.uuid}/job/${job.uuid}`);
  });
});
