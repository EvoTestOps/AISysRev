import { test, expect } from "@playwright/test";
import { loginAndConsent } from "./helpers/auth";
import { seedPapers, seedProjectWithPapers, seedProjects, uploadCsvPapers } from "./helpers/seed";
import { createZeroShotMockJob, waitForJobCompletion } from "./helpers/job";

const prefix = "/api/v1";

test.describe("Paper API", () => {
  test.beforeEach(async ({ request }) => {
    await loginAndConsent(request);
  });

  test("Fetch papers for a project", async ({ request }) => {
    const { project, papers } = await seedProjectWithPapers(request, "Paper Project", 3);

    const res = await request.get(`${prefix}/paper/${project.uuid}`);
    expect(res.status()).toBe(200);
    const fetched = await res.json();
    expect(fetched.length).toBe(3);
    expect(fetched.map((p: { uuid: string }) => p.uuid).sort()).toEqual(
      papers.map((p) => p.uuid).sort(),
    );
  });

  test("Fetch papers with model evaluations after a completed job", async ({
    request,
  }) => {
    const { project } = await seedProjectWithPapers(request, "Paper Eval Project", 1);
    const job = await createZeroShotMockJob(request, project.uuid);
    await waitForJobCompletion(request, job.uuid);

    const res = await request.get(
      `${prefix}/paper/${project.uuid}/with_model_evaluations`,
    );
    expect(res.status()).toBe(200);
    const papers = await res.json();
    expect(papers.length).toBe(1);
    expect(papers[0].avg_probability_decision).toBeGreaterThan(0);
  });

  test("Add a human result to a paper", async ({ request }) => {
    const { papers } = await seedProjectWithPapers(request, "Paper Human Result", 1);

    const res = await request.patch(`${prefix}/paper/${papers[0].uuid}`, {
      data: { human_result: "EXCLUDE" },
    });
    expect(res.status()).toBe(200);

    const listRes = await request.get(`${prefix}/paper/${papers[0].project_uuid}`);
    const [paper] = await listRes.json();
    expect(paper.human_result).toBe("EXCLUDE");
  });

  test("Download RIS of papers missing full text", async ({ request }) => {
    const { project } = await seedProjectWithPapers(request, "Paper RIS Project", 2);

    const res = await request.get(`${prefix}/paper/${project.uuid}/missing_fulltext_ris`);
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body.length).toBeGreaterThan(0);
  });

  test("Batch create papers requires a source file reference", async ({ request }) => {
    const [project] = await seedProjects(request, [
      { name: "No File Project", criteria: { inclusion_criteria: ["IC"], exclusion_criteria: ["EC"] } },
    ]);

    const res = await request.post(`${prefix}/paper/batch`, {
      data: [
        {
          project_uuid: project.uuid,
          paper_id: 1,
          title: "No source file",
          abstract: "Should fail",
          doi: null,
        },
      ],
    });
    expect(res.status()).toBe(400);
  });

  test("Batch create and delete papers", async ({ request }) => {
    const [project] = await seedProjects(request, [
      { name: "Batch Paper Project", criteria: { inclusion_criteria: ["IC"], exclusion_criteria: ["EC"] } },
    ]);
    const [existingPaper] = await uploadCsvPapers(request, project.uuid, [
      { title: "Uploaded Paper", abstract: "Uploaded abstract" },
    ]);

    const created = await seedPapers(request, [
      {
        project_uuid: project.uuid,
        paper_id: existingPaper.paper_id + 1,
        title: "Batch Paper",
        abstract: "Batch abstract",
        file_uuid: existingPaper.file_uuid,
      },
    ]);
    expect(created.length).toBe(1);

    const deleteRes = await request.delete(`${prefix}/paper/batch`, {
      data: [created[0].uuid],
    });
    expect(deleteRes.status()).toBe(200);
    const body = await deleteRes.json();
    expect(body.deleted).toEqual([created[0].uuid]);
  });
});
