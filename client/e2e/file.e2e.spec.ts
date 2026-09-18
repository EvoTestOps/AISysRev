import { test, expect } from "@playwright/test";
import { loginAndConsentUI } from "./helpers/auth";
import { seedProjects, uniqueName } from "./helpers/seed";

const prefix = "/api/v1";

const VALID_CSV = "title,abstract,doi\nPaper One,Abstract one,10.1234/one\n";

test.describe("File Upload UI", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndConsentUI(page);
  });

  test("Upload a CSV via the drop area and see papers listed", async ({ page }) => {
    const [project] = await seedProjects(page.request, [
      {
        name: uniqueName("UI Upload Project"),
        criteria: { inclusion_criteria: ["IC1"], exclusion_criteria: ["EC1"] },
      },
    ]);

    await page.goto(`/project/${project.uuid}`);

    const fileInput = page.getByTestId("csv-file-input");
    await fileInput.setInputFiles({
      name: "papers.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(VALID_CSV),
    });

    await expect(page.getByTestId("csv-file-drop-area")).not.toBeVisible({
      timeout: 15000,
    });

    await expect
      .poll(async () => {
        const papersRes = await page.request.get(`${prefix}/paper/${project.uuid}`);
        return (await papersRes.json()).length;
      })
      .toBe(1);
  });
});
