import { test, expect } from "@playwright/test";
import { loginAndConsentUI } from "./helpers/auth";
import { seedProjectWithPapers, uniqueName, uploadCsvPapers, seedProjects } from "./helpers/seed";

test.describe("List of papers page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndConsentUI(page);
  });

  test("Lists seeded papers and shows the project's criteria", async ({ page }) => {
    const { project } = await seedProjectWithPapers(
      page.request,
      uniqueName("Papers List Project"),
      3,
    );

    await page.goto(`/project/${project.uuid}/papers/page/1`);

    for (let i = 1; i <= 3; i++) {
      await expect(page.getByTestId(`paper-${i}`)).toBeVisible();
    }
    await expect(page.getByTestId("no-papers-text")).not.toBeVisible();

    await expect(page.getByTestId("inclusion-criteria")).toContainText(
      "Test inclusion criteria",
    );
    await expect(page.getByTestId("exclusion-criteria")).toContainText(
      "Test exclusion criteria",
    );
  });

  test("Hides already-evaluated papers by default, and the filter toggle reveals them", async ({
    page,
  }) => {
    const { project, papers } = await seedProjectWithPapers(
      page.request,
      uniqueName("Papers Filter Project"),
      2,
    );

    const evaluatedPaper = papers[0];
    const patchRes = await page.request.patch(`/api/v1/paper/${evaluatedPaper.uuid}`, {
      data: { human_result: "INCLUDE" },
    });
    expect(patchRes.status()).toBe(200);

    await page.goto(`/project/${project.uuid}/papers/page/1`);

    await expect(page.getByTestId(`paper-${papers[1].paper_id}`)).toBeVisible();
    await expect(
      page.getByTestId(`paper-${evaluatedPaper.paper_id}`),
    ).not.toBeVisible();
    await expect(page.getByTestId("label-filter_out_evaluated")).toContainText("(1)");

    await page.getByTestId("input-filter_out_evaluated").uncheck();

    await expect(
      page.getByTestId(`paper-${evaluatedPaper.paper_id}`),
    ).toBeVisible();
  });

  test("Sorting by ID toggles ascending/descending order", async ({ page }) => {
    const { project } = await seedProjectWithPapers(
      page.request,
      uniqueName("Papers Sort Project"),
      3,
    );

    await page.goto(`/project/${project.uuid}/papers/page/1`);

    const paperRows = page.locator('[data-testid^="paper-"]');
    await expect(paperRows).toHaveCount(3);
    await expect(paperRows.nth(0)).toHaveAttribute("data-testid", "paper-1");
    await expect(paperRows.nth(2)).toHaveAttribute("data-testid", "paper-3");

    await page.getByTestId("sort-by-id").click();

    await expect(paperRows.nth(0)).toHaveAttribute("data-testid", "paper-3");
    await expect(paperRows.nth(2)).toHaveAttribute("data-testid", "paper-1");
  });

  test("Expanding a paper and setting Include updates its human result", async ({
    page,
  }) => {
    const { project, papers } = await seedProjectWithPapers(
      page.request,
      uniqueName("Papers Decision Project"),
      1,
    );

    await page.goto(`/project/${project.uuid}/papers/page/1`);

    const paperRow = page.getByTestId(`paper-${papers[0].paper_id}`);
    await paperRow.locator("button").first().click();

    await paperRow.getByRole("button", { name: "Include" }).click();

    await expect
      .poll(async () => {
        const res = await page.request.get(`/api/v1/paper/${project.uuid}`);
        const [paper] = await res.json();
        return paper.human_result;
      })
      .toBe("INCLUDE");
  });

  test("Paginates when there are more papers than fit on one page", async ({
    page,
  }) => {
    const [project] = await seedProjects(page.request, [
      {
        name: uniqueName("Papers Pagination Project"),
        criteria: { inclusion_criteria: ["IC1"], exclusion_criteria: ["EC1"] },
      },
    ]);
    await uploadCsvPapers(
      page.request,
      project.uuid,
      Array.from({ length: 30 }, (_, i) => ({
        title: `Pagination Paper ${i + 1}`,
        abstract: `Abstract ${i + 1}`,
      })),
    );

    await page.goto(`/project/${project.uuid}/papers/page/1`);

    await expect(page.getByTestId("pagination-card")).toBeVisible();
    await expect(page.locator('[data-testid^="paper-"]')).toHaveCount(25);

    await page.getByTestId("pagination-card").getByText("2", { exact: true }).click();

    await page.waitForURL(`**/project/${project.uuid}/papers/page/2`);
    await expect(page.locator('[data-testid^="paper-"]')).toHaveCount(5);
  });
});
