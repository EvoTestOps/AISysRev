import { test, expect } from "@playwright/test";
import { loginAndConsent } from "./helpers/auth";
import { seedProjectWithPapers, uniqueName } from "./helpers/seed";
import { createZeroShotMockJob, mockLlmConfig, waitForJobCompletion } from "./helpers/job";

const prefix = "/api/v1";

test.describe("Job API", () => {
  let mockProject: { uuid: string };
  let mockCreateJob: { uuid: string; project_uuid: string };

  test.beforeEach(async ({ request }) => {
    await loginAndConsent(request);

    const { project } = await seedProjectWithPapers(
      request,
      uniqueName("Test Project for Job"),
      1,
    );
    mockProject = project;
    mockCreateJob = await createZeroShotMockJob(request, project.uuid);
    expect(mockCreateJob.project_uuid).toBe(mockProject.uuid);
  });

  test("Fetch all jobs returns 200 and an array containing the mock job", async ({
    request,
  }) => {
    const res = await request.get(`${prefix}/job`);
    expect(res.status()).toBe(200);

    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(
      data.some((job: { uuid: string }) => job.uuid === mockCreateJob.uuid),
    ).toBe(true);
  });

  test("Fetch jobs by project returns array with jobs for the given project", async ({
    request,
  }) => {
    const res = await request.get(`${prefix}/job?project=${mockProject.uuid}`);
    expect(res.status()).toBe(200);

    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(1);
    expect(data[0].prompting_config.screening_type).toBe("ZERO_SHOT");
    expect(
      data.every((job: { project_uuid: string }) => job.project_uuid === mockProject.uuid),
    ).toBe(true);
    expect(data.some((job: { uuid: string }) => job.uuid === mockCreateJob.uuid)).toBe(
      true,
    );
  });

  test("Fetch single job by UUID returns the correct job", async ({ request }) => {
    const res = await request.get(`${prefix}/job/${mockCreateJob.uuid}`);
    expect(res.status()).toBe(200);

    const job = await res.json();
    expect(job.uuid).toBe(mockCreateJob.uuid);
    expect(job.project_uuid).toBe(mockProject.uuid);
    expect(job.llm_config.provider_name).toBe(mockLlmConfig.provider_name);
    expect(job.llm_config.model_name).toBe(mockLlmConfig.model_name);
    expect(job.prompting_config.screening_type).toBe("ZERO_SHOT");
  });

  test("Creating a job with invalid project UUID returns 400", async ({ request }) => {
    const res = await request.post(`${prefix}/job`, {
      data: {
        project_uuid: "00000000-0000-0000-0000-000000000000",
        llm_config: mockLlmConfig,
        prompting_config: { screening_type: "ZERO_SHOT" },
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.detail).toContain("not found");
  });

  test("The mock job completes successfully and produces include decisions", async ({
    request,
  }) => {
    const status = await waitForJobCompletion(request, mockCreateJob.uuid);
    expect(status).toBe("SUCCESS");

    const jobTasksRes = await request.get(`${prefix}/jobtask/${mockCreateJob.uuid}`);
    expect(jobTasksRes.status()).toBe(200);
    const jobTasks = await jobTasksRes.json();
    expect(jobTasks.length).toBe(1);
    expect(jobTasks[0].status).toBe("DONE");
    expect(jobTasks[0].result.overall_decision.binary_decision).toBe(true);
  });

  test("Deleting a job removes it from the list", async ({ request }) => {
    const res = await request.delete(`${prefix}/job/${mockCreateJob.uuid}`);
    expect(res.status()).toBe(200);

    const listRes = await request.get(`${prefix}/job?project=${mockProject.uuid}`);
    const jobs = await listRes.json();
    expect(jobs.length).toBe(0);
  });
});
