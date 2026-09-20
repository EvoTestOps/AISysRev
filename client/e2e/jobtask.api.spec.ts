import { test, expect } from "@playwright/test";
import { loginAndConsent } from "./helpers/auth";
import { seedProjectWithPapers, uniqueName } from "./helpers/seed";
import { createZeroShotMockJob, waitForJobCompletion } from "./helpers/job";

const prefix = "/api/v1";

test.describe("Job task API", () => {
  let paperUuid: string;
  let jobUuid: string;

  test.beforeEach(async ({ request }) => {
    await loginAndConsent(request);

    const { project, papers } = await seedProjectWithPapers(
      request,
      uniqueName("Job Task Test Project"),
      1,
    );
    paperUuid = papers[0].uuid;

    const job = await createZeroShotMockJob(request, project.uuid);
    jobUuid = job.uuid;
    await waitForJobCompletion(request, jobUuid);
  });

  test("Fetch job tasks by job UUID", async ({ request }) => {
    const res = await request.get(`${prefix}/jobtask/${jobUuid}`);
    expect(res.status()).toBe(200);
    const tasks = await res.json();
    expect(tasks.length).toBe(1);
    expect(tasks[0].paper_uuid).toBe(paperUuid);
    expect(tasks[0].status).toBe("DONE");
  });

  test("Fetch job tasks by paper UUID", async ({ request }) => {
    const res = await request.get(`${prefix}/jobtask?paper_uuid=${paperUuid}`);
    expect(res.status()).toBe(200);
    const tasks = await res.json();
    expect(tasks.length).toBe(1);
    expect(tasks[0].paper_uuid).toBe(paperUuid);
  });

  test("Add a human result to a job task", async ({ request }) => {
    const tasksRes = await request.get(`${prefix}/jobtask?paper_uuid=${paperUuid}`);
    const [task] = await tasksRes.json();

    const patchRes = await request.patch(`${prefix}/jobtask/${task.uuid}`, {
      data: { human_result: "INCLUDE" },
    });
    expect(patchRes.status()).toBe(200);

    const tasksAfter = await request.get(`${prefix}/jobtask?paper_uuid=${paperUuid}`);
    const [updated] = await tasksAfter.json();
    expect(updated.human_result).toBe("INCLUDE");
  });
});
