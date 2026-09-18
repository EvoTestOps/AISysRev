import { test, expect } from "@playwright/test";
import { loginAndConsent } from "./helpers/auth";
import { resetFixtures, seedProjectWithPapers } from "./helpers/seed";
import { createZeroShotMockJob, waitForJobCompletion } from "./helpers/job";

const prefix = "/api/v1";

test.describe("Result API", () => {
  let projectUuid: string;

  test.beforeEach(async ({ request }) => {
    await resetFixtures(request);
    await loginAndConsent(request);

    const { project } = await seedProjectWithPapers(request, "Result Project", 2);
    projectUuid = project.uuid;
    const job = await createZeroShotMockJob(request, project.uuid);
    await waitForJobCompletion(request, job.uuid);
  });

  test("Fetch aggregated result for a project", async ({ request }) => {
    const res = await request.get(`${prefix}/result/?project_uuid=${projectUuid}`);
    expect(res.status()).toBe(200);
  });

  test("Fetch per-criteria agreement stats", async ({ request }) => {
    const res = await request.get(
      `${prefix}/result/per_criteria_stats?project_uuid=${projectUuid}`,
    );
    expect(res.status()).toBe(200);
  });

  test("Download result CSV", async ({ request }) => {
    const res = await request.get(
      `${prefix}/result/download_result_csv?project_uuid=${projectUuid}&screening_target=PAPER`,
    );
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/csv");
    const body = await res.text();
    expect(body.length).toBeGreaterThan(0);
  });

  test("Download result HTML report", async ({ request }) => {
    const res = await request.get(
      `${prefix}/result/html?project_uuid=${projectUuid}&screening_target=PAPER`,
    );
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("<html>");
  });
});
