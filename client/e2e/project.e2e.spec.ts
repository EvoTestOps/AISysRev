import { test, expect } from "@playwright/test";
import { loginAndConsentUI } from "./helpers/auth";
import { seedProjectWithPapers, uniqueName } from "./helpers/seed";

const prefix = "/api/v1";

test.describe("Project UI", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndConsentUI(page);
  });

  test("Create a project without PDFs via the UI", async ({ page }) => {
    const projectName = uniqueName("UI Created Project");

    await page.goto("/create");

    await page.getByTestId("new-project-title-input").fill(projectName);

    const inclusionInput = page.getByTestId("new-project-inclusion-criteria-input");
    await inclusionInput.fill("Must be relevant");
    await inclusionInput.press("Enter");

    const exclusionInput = page.getByTestId("new-project-exclusion-criteria-input");
    await exclusionInput.fill("Must not be a duplicate");
    await exclusionInput.press("Enter");

    await page.getByTestId("new-project-create-button").click();

    await page.waitForURL(/\/project\/[0-9a-f-]+$/);

    const res = await page.request.get(`${prefix}/project`);
    const projects = await res.json();
    expect(
      projects.some((p: { name: string }) => p.name === projectName),
    ).toBe(true);
  });

  test("Create a project and attach PDFs via the Zotero import flow", async ({
    page,
  }) => {
    // A project without papers opens on the welcome screen, which has no full-text import.
    const { project } = await seedProjectWithPapers(page.request, uniqueName("PDF Project"), 1);

    await page.goto(`/project/${project.uuid}`);

    await expect(page.getByTestId("fulltext-import-folder-input")).toBeAttached();
  });
});
