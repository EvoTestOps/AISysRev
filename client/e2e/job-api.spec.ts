import { test, expect } from '@playwright/test';

const prefix = '/api/v1';

let mockProject: { id: number, uuid: string; name: string; inclusion_criteria: string, exclusion_criteria: string };
let mockCreateJob: { uuid: string, project_uuid: string, llm_config: Record<string, unknown> }

// TODO: Think of a better solution to reset and create fixtures
test.beforeEach(async ({ request }) => {
  const fixtureRes = await request.post(`${prefix}/fixtures/reset`)
  expect(fixtureRes.status()).toBe(200)
  const createRes = await request.post(`${prefix}/project`, {
    data: {
      name: 'Test Project for Job',
      inclusion_criteria: 'Test inclusion criteria',
      exclusion_criteria: 'Test exclusion criteria'
    },
  });
  expect(createRes.status(), 'project should be created').toBe(201);

  const createdProject = await createRes.json();
  const projectRes = await request.get(`${prefix}/project/${createdProject.uuid}`);
  expect(projectRes.status()).toBe(200);

  mockProject = await projectRes.json();

  const createJobRes = await request.post(`${prefix}/job`, {
    data: {
      project_uuid: mockProject.uuid,
      llm_config: {
        model_name: "gpt-4",
        temperature: 0.7,
        seed: 42,
        top_p: 0.9
      }
    }
  });
  expect(createJobRes.status(), 'job should be created').toBe(201);

  mockCreateJob = await createJobRes.json()

  expect(mockCreateJob.uuid).toBeTruthy();
  expect(mockCreateJob.project_uuid).toBe(mockProject.uuid);
});

test('Fetch all jobs returns 200 and an array with the mock job', async ({
  request,
}) => {
  const res = await request.get(`${prefix}/job`);
  expect(res.status()).toBe(200)

  const data: Array<{ project_uuid: string; llm_config: Record<string, unknown> }> =
    await res.json();
    expect(data.length).toBe(1)
    expect(Array.isArray(data)).toBe(true)
    expect(data.some(job => job.project_uuid === mockProject.uuid)).toBe(true);
});

test('Fetch jobs by project returns array with jobs for the given project', async ({ request }) => {
  const res = await request.get(`${prefix}/job?project=${mockProject.uuid}`);
  expect(res.status()).toBe(200);

  const data: Array<{ uuid: string; project_uuid: string; llm_config: Record<string, unknown> }> = await res.json();
  expect(Array.isArray(data)).toBe(true);
  expect(data.length).toBe(1)
  expect(data.every(job => job.project_uuid === mockProject.uuid)).toBe(true);
  expect(data.some(job => job.uuid === mockCreateJob.uuid)).toBe(true);
});

test('Fetch single job by UUID returns the correct job', async ({ request }) => {
  const res = await request.get(`${prefix}/job/${mockCreateJob.uuid}`);
  expect(res.status()).toBe(200);

  const job: { uuid: string; project_uuid: string; llm_config: Record<string, unknown> } = await res.json();
  expect(job.uuid).toBe(mockCreateJob.uuid);
  expect(job.project_uuid).toBe(mockProject.uuid);
  expect(job.llm_config.model_name).toBe('gpt-4');
  expect(job.llm_config.temperature).toBe(0.7)
  expect(job.llm_config.seed).toBe(42)
  expect(job.llm_config.top_p).toBe(0.9)
});

test('Creating a job with invalid project UUID returns 400', async ({ request }) => {
  const res = await request.post(`${prefix}/job`, {
    data: {
      project_uuid: '00000000-0000-0000-0000-000000000000',
      llm_config: {
        model_name: 'gpt-4',
        temperature: 0.7,
        seed: 42,
        top_p: 0.9,
      },
    },
  });
  expect(res.status()).toBe(400);
  const body = await res.json();
  expect(body.detail).toContain('not found');
});
