import { test, expect } from "@playwright/test";
import { loginAndConsentUI } from "./helpers/auth";
import { seedProjectWithPapers, uniqueName } from "./helpers/seed";

test.describe("Manual evaluation modal", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndConsentUI(page);
  });

  test("Evaluate papers by clicking Include/Exclude/Unsure", async ({ page }) => {
    const { project, papers } = await seedProjectWithPapers(
      page.request,
      uniqueName("Manual Eval Project"),
      3,
    );

    await page.goto(`/project/${project.uuid}/evaluate?paperUuid=${papers[0].uuid}`);

    await expect(page.getByTestId("manual-evaluation-include-button")).toBeVisible();

    await page.getByTestId("manual-evaluation-include-button").click();
    await expect(page.getByTestId("manual-evaluation-exclude-button")).toBeVisible();
    await page.getByTestId("manual-evaluation-exclude-button").click();
    await expect(page.getByTestId("manual-evaluation-unsure-button")).toBeVisible();
    await page.getByTestId("manual-evaluation-unsure-button").click();

    const findResult = async (uuid: string) => {
      const res = await page.request.get(`/api/v1/paper/${project.uuid}`);
      const all: { uuid: string; human_result: string | null }[] = await res.json();
      return all.find((x) => x.uuid === uuid)?.human_result;
    };

    await expect.poll(() => findResult(papers[2].uuid)).toBe("UNSURE");
    expect(await findResult(papers[0].uuid)).toBe("INCLUDE");
    expect(await findResult(papers[1].uuid)).toBe("EXCLUDE");
  });

  test("Evaluate a paper using keyboard shortcuts", async ({ page }) => {
    const { project, papers } = await seedProjectWithPapers(
      page.request,
      uniqueName("Manual Eval Keyboard Project"),
      1,
    );

    await page.goto(`/project/${project.uuid}/evaluate?paperUuid=${papers[0].uuid}`);

    await expect(page.getByTestId("manual-evaluation-include-button")).toBeVisible();
    await page.keyboard.press("y");

    await expect
      .poll(async () => {
        const res = await page.request.get(`/api/v1/paper/${project.uuid}`);
        const [paper] = await res.json();
        return paper.human_result;
      })
      .toBe("INCLUDE");
  });
});
