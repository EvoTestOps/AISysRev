import { test, expect } from "@playwright/test";

let mockProject: {
  uuid: string;
  name: string;
  criteria: {
    inclusion_criteria: string[];
    exclusion_criteria: string[];
  };
};
let mockCreateJob: {
  uuid: string;
  project_uuid: string;
  llm_config: Record<string, unknown>;
};

// TODO: Skip Job tests for now
test.describe.skip("Job API", () => {
  test.beforeEach(async ({ request }) => {
    const fixtureRes = await request.post(`/api/v1/fixtures/reset`);
    expect(fixtureRes.status()).toBe(200);
    const createRes = await request.post(`/api/v1/project`, {
      data: {
        name: "Test Project for Job",
        criteria: {
          inclusion_criteria: ["Test inclusion criteria"],
          exclusion_criteria: ["Test exclusion criteria"],
        },
      },
    });
    expect(createRes.status(), "project should be created").toBe(201);

    const createdProject = await createRes.json();
    const projectRes = await request.get(
      `/api/v1/project/${createdProject.uuid}`,
    );
    expect(projectRes.status()).toBe(200);

    mockProject = await projectRes.json();

    const createJobRes = await request.post(`/api/v1/job`, {
      data: {
        project_uuid: mockProject.uuid,
        llm_config: {
          provider_name: "mock",
          model_name: "mock_001",
          temperature: 0.0,
          top_p: 0.1,
        },
        prompting_config: {
          screening_type: "ZERO_SHOT",
        },
      },
    });
    expect(createJobRes.status(), "job should be created").toBe(201);

    mockCreateJob = await createJobRes.json();

    expect(mockCreateJob.uuid).toBeTruthy();
    expect(mockCreateJob.project_uuid).toBe(mockProject.uuid);
  });
  test("Fetch all jobs returns 200 and an array with the mock job", async ({
    request,
  }) => {
    const res = await request.get(`/api/v1/job`);
    expect(res.status()).toBe(200);

    const data: Array<{
      project_uuid: string;
      llm_config: Record<string, unknown>;
    }> = await res.json();
    expect(data.length).toBe(1);
    expect(Array.isArray(data)).toBe(true);
    expect(data.some((job) => job.project_uuid === mockProject.uuid)).toBe(
      true,
    );
  });

  test("Fetch jobs by project returns array with jobs for the given project", async ({
    request,
  }) => {
    const res = await request.get(`/api/v1/job?project=${mockProject.uuid}`);
    expect(res.status()).toBe(200);

    const data: Array<{
      uuid: string;
      project_uuid: string;
      llm_config: Record<string, unknown>;
      prompting_config: Record<string, unknown>;
    }> = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(1);
    expect(data[0].prompting_config.screening_type).toBe("ZERO_SHOT");
    expect(data.every((job) => job.project_uuid === mockProject.uuid)).toBe(
      true,
    );
    expect(data.some((job) => job.uuid === mockCreateJob.uuid)).toBe(true);
  });

  test("Fetch single job by UUID returns the correct job", async ({
    request,
  }) => {
    const res = await request.get(`/api/v1/job/${mockCreateJob.uuid}`);
    expect(res.status()).toBe(200);

    const job: {
      uuid: string;
      project_uuid: string;
      llm_config: Record<string, unknown>;
      prompting_config: Record<string, unknown>;
    } = await res.json();
    expect(job.uuid).toBe(mockCreateJob.uuid);
    expect(job.project_uuid).toBe(mockProject.uuid);
    expect(job.llm_config.model_name).toBe("gpt-4");
    expect(job.llm_config.temperature).toBe(0.7);
    expect(job.llm_config.seed).toBe(42);
    expect(job.llm_config.top_p).toBe(0.9);
    expect(job.prompting_config.screening_type).toBe("ZERO_SHOT");
  });

  test("Creating a job with invalid project UUID returns 400", async ({
    request,
  }) => {
    const res = await request.post(`/api/v1/job`, {
      data: {
        project_uuid: "00000000-0000-0000-0000-000000000000",
        llm_config: {
          provider_name: "mock",
          model_name: "mock_001",
          temperature: 0.0,
          top_p: 0.1,
        },
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.detail).toContain("not found");
  });
});
