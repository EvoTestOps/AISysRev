import { APIRequestContext, Page, expect, test } from "@playwright/test";
import { loginAndConsentUI } from "./helpers/auth";
import { mockLlmConfig } from "./helpers/job";
import { SeededPaper, seedProjectWithPapers, uniqueName } from "./helpers/seed";

const prefix = "/api/v1";

type Label = "INCLUDE" | "EXCLUDE";

async function labelPaper(request: APIRequestContext, paperUuid: string, label: Label) {
  const res = await request.patch(`${prefix}/paper/${paperUuid}`, {
    data: { human_result: label },
  });
  expect(res.status(), "paper should be labelled").toBe(200);
}

/** A project whose first two papers are labelled included and the next two excluded. */
async function seedLabelledProject(request: APIRequestContext, name: string) {
  const { project, papers } = await seedProjectWithPapers(request, uniqueName(name), 4);
  const [inc1, inc2, exc1, exc2] = papers;
  await labelPaper(request, inc1.uuid, "INCLUDE");
  await labelPaper(request, inc2.uuid, "INCLUDE");
  await labelPaper(request, exc1.uuid, "EXCLUDE");
  await labelPaper(request, exc2.uuid, "EXCLUDE");
  return { project, inc1, inc2, exc1, exc2 };
}

type Job = {
  uuid: string;
  screening_mode: string;
  prompting_config: {
    screening_type: string;
    seed_paper_inc?: string[];
    seed_paper_exc?: string[];
    remember_selection?: boolean;
  };
};

async function jobsOf(request: APIRequestContext, projectUuid: string): Promise<Job[]> {
  const res = await request.get(`${prefix}/job?project=${projectUuid}`);
  expect(res.status()).toBe(200);
  return res.json();
}

/**
 * Clicks one button of a segmented control until it reads as pressed: the
 * controls sit in a panel that animates open, which can swallow an early click.
 */
async function pressSegment(page: Page, testId: string) {
  const button = page.getByTestId(testId);
  await expect(async () => {
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true", { timeout: 1000 });
  }).toPass();
}

/** Fills the task form with the mock model and few-shot prompting, then opens the modal. */
async function openFewShotFromTaskForm(page: Page, projectUuid: string, mode?: "automatic") {
  await page.goto(`/project/${projectUuid}`);
  await page.getByTestId("llm-provider-dropdown").click();
  await page.getByTestId("llm-provider-dropdown-option-mock").click();
  await page.getByTestId("llm-model-dropdown").click();
  await page.getByTestId("llm-model-dropdown-option-mock-small").click();

  // The prompting strategy and screening mode are folded away under "Customize".
  await page.getByTestId("customize-task-options").click();
  await pressSegment(page, "prompting-strategy-few-shot-button");
  if (mode === "automatic") {
    await pressSegment(page, "screening-mode-automatic-button");
  }

  await page.getByTestId("create-task-button").click();
  await expect(page).toHaveURL(new RegExp(`/project/${projectUuid}/few_shot`));
  await expect(page.getByTestId("few-shot-dialog")).toBeVisible();
}

const seed = (page: Page, paper: SeededPaper) => page.getByTestId(`few-shot-seed-${paper.uuid}`);

test.describe("Few-shot modal", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndConsentUI(page);
  });

  test("Start a few-shot task with the chosen examples", async ({ page }) => {
    const { project, inc1, inc2, exc1, exc2 } = await seedLabelledProject(
      page.request,
      "Few-shot Project",
    );

    await openFewShotFromTaskForm(page, project.uuid);

    // Step 1 lists only the included papers.
    const inclusionList = page.getByTestId("few-shot-inclusion-list");
    await expect(seed(page, inc1)).toBeVisible();
    await expect(seed(page, inc2)).toBeVisible();
    await expect(inclusionList.getByTestId(`few-shot-seed-${exc1.uuid}`)).toHaveCount(0);
    await seed(page, inc1).click();
    await expect(seed(page, inc1).getByRole("checkbox")).toBeChecked();
    await expect(page.getByTestId("few-shot-step-0")).toContainText("1 selected");

    // Step 2 lists only the excluded papers.
    await page.getByTestId("few-shot-next-button").click();
    await expect(seed(page, exc1)).toBeVisible();
    await expect(seed(page, exc2)).toBeVisible();
    await expect(seed(page, inc2)).toHaveCount(0);
    await seed(page, exc2).click();

    // The review shows the model and mode the task form chose.
    await page.getByTestId("few-shot-next-button").click();
    await expect(page.getByTestId("few-shot-model")).toHaveText("mock-small (mock)");
    await expect(page.getByTestId("few-shot-screening-mode")).toHaveText("Title+Abstract");
    await expect(page.getByTestId("few-shot-remember-checkbox")).toBeChecked();

    await page.getByTestId("few-shot-start-button").click();
    await expect(page).toHaveURL(new RegExp(`/project/${project.uuid}$`));

    await expect.poll(async () => (await jobsOf(page.request, project.uuid)).length).toBe(1);
    const [job] = await jobsOf(page.request, project.uuid);
    expect(job.screening_mode).toBe("TEXT");
    expect(job.prompting_config).toMatchObject({
      screening_type: "FEW_SHOT",
      seed_paper_inc: [inc1.uuid],
      seed_paper_exc: [exc2.uuid],
      remember_selection: true,
    });
  });

  test("Refreshing the modal keeps it working, with the model and screening mode", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const { project, inc1, exc1 } = await seedLabelledProject(
      page.request,
      "Few-shot Refresh Project",
    );

    // Automatic, not PDF: PDF mode needs papers with PDFs, and these have none.
    await openFewShotFromTaskForm(page, project.uuid, "automatic");
    // Don't wait for the load event: the page's event stream can cut it short in
    // WebKit and Firefox. The dialog assertion below waits for the page instead.
    await page.reload({ waitUntil: "commit" });

    // The task form restores the last provider and model; the URL keeps the mode.
    await expect(page.getByTestId("few-shot-dialog")).toBeVisible();
    await seed(page, inc1).click();
    await page.getByTestId("few-shot-next-button").click();
    await seed(page, exc1).click();
    await page.getByTestId("few-shot-next-button").click();
    await expect(page.getByTestId("few-shot-model")).toHaveText("mock-small (mock)", {
      timeout: 15000,
    });
    await expect(page.getByTestId("few-shot-screening-mode")).toHaveText(
      "Full text when available",
    );

    await page.getByTestId("few-shot-start-button").click();
    await expect.poll(async () => (await jobsOf(page.request, project.uuid)).length).toBe(1);
    const [job] = await jobsOf(page.request, project.uuid);
    expect(job.screening_mode).toBe("AUTOMATIC");
    expect(job.prompting_config.seed_paper_inc).toEqual([inc1.uuid]);
    expect(job.prompting_config.seed_paper_exc).toEqual([exc1.uuid]);

    expect(pageErrors).toEqual([]);
  });

  test("Without a chosen model the task can't be started", async ({ page }) => {
    const { project, inc1 } = await seedLabelledProject(page.request, "Few-shot No Model Project");

    // A fresh browser has no remembered provider or model to restore.
    await page.goto(`/project/${project.uuid}/few_shot`);
    await seed(page, inc1).click();
    await page.getByTestId("few-shot-step-2").click();

    await expect(page.getByTestId("few-shot-model")).toHaveText("Not selected");
    await expect(page.getByTestId("few-shot-no-model")).toBeVisible();
    await expect(page.getByTestId("few-shot-start-button")).toBeDisabled();

    await page.getByRole("button", { name: "Close" }).click();
    await expect(page).toHaveURL(new RegExp(`/project/${project.uuid}$`));
    expect(await jobsOf(page.request, project.uuid)).toEqual([]);
  });

  test("Remembered examples are preselected, minus papers relabelled since", async ({ page }) => {
    const { project, inc1, inc2, exc1 } = await seedLabelledProject(
      page.request,
      "Few-shot Remembered Project",
    );
    const res = await page.request.post(`${prefix}/job`, {
      data: {
        project_uuid: project.uuid,
        llm_config: mockLlmConfig,
        prompting_config: {
          screening_type: "FEW_SHOT",
          seed_paper_inc: [inc1.uuid, inc2.uuid],
          seed_paper_exc: [exc1.uuid],
          remember_selection: true,
        },
        screening_mode: "TEXT",
      },
    });
    expect(res.status(), "few-shot job should be created").toBe(201);
    // inc2 was remembered as an inclusion example but is now labelled excluded.
    await labelPaper(page.request, inc2.uuid, "EXCLUDE");

    await page.goto(`/project/${project.uuid}/few_shot`);

    await expect(seed(page, inc1).getByRole("checkbox")).toBeChecked();
    await expect(page.getByTestId("few-shot-step-0")).toContainText("1 selected");

    await page.getByTestId("few-shot-next-button").click();
    await expect(seed(page, exc1).getByRole("checkbox")).toBeChecked();
    await expect(seed(page, inc2).getByRole("checkbox")).not.toBeChecked();
    await expect(page.getByTestId("few-shot-step-1")).toContainText("1 selected");
  });

  test("Select all toggles every paper in the list", async ({ page }) => {
    const { project, inc1, inc2 } = await seedLabelledProject(
      page.request,
      "Few-shot Select All Project",
    );

    await page.goto(`/project/${project.uuid}/few_shot`);
    const selectAll = page.getByTestId("few-shot-inclusion-list-select-all").getByRole("checkbox");

    await selectAll.check();
    await expect(seed(page, inc1).getByRole("checkbox")).toBeChecked();
    await expect(seed(page, inc2).getByRole("checkbox")).toBeChecked();
    await expect(page.getByTestId("few-shot-step-0")).toContainText("2 selected");

    await selectAll.uncheck();
    await expect(seed(page, inc1).getByRole("checkbox")).not.toBeChecked();
    await expect(page.getByTestId("few-shot-step-0")).toContainText("0 selected");
  });

  test("Without manually labelled papers there is nothing to review", async ({ page }) => {
    const { project } = await seedProjectWithPapers(
      page.request,
      uniqueName("Few-shot Unlabelled Project"),
      2,
    );

    await page.goto(`/project/${project.uuid}/few_shot`);
    await expect(page.getByTestId("few-shot-inclusion-list-empty")).toBeVisible();

    await page.getByTestId("few-shot-next-button").click();
    await expect(page.getByTestId("few-shot-exclusion-list-empty")).toBeVisible();
    await expect(page.getByTestId("few-shot-next-button")).toBeDisabled();
    await expect(page.getByTestId("few-shot-step-2")).toBeDisabled();
  });
});
