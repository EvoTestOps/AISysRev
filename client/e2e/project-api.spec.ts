import { test, expect } from '@playwright/test';

let mockProject: { uuid: string; name: string; inclusion_criteria: string, exclusion_criteria: string };

// TODO: Think of a better solution to reset and create fixtures
test.beforeEach(async ({ request }) => {
  const fixtureRes = await request.post("/api/v1/fixtures/reset")
  expect(fixtureRes.status()).toBe(200)
  const createRes = await request.post('/api/project', {
    data: { name: 'Test Project', inclusion_criteria: 'Test inclusion criteria', exclusion_criteria: 'Test exclusion criteria' },
  });
  expect(createRes.status(), 'project should be created').toBe(201);

  const listRes = await request.get('/api/project');
  expect(listRes.status()).toBe(200);
  const projects: Array<{ uuid: string; name: string; inclusion_criteria: string, exclusion_criteria: string }> =
    await listRes.json();

  const found = projects.find((p) => p.name === 'Test Project');
  expect(found, 'created project should be in list').toBeTruthy();

  mockProject = found as typeof mockProject;
});

test('Fetch all projects returns 200 and an array with the mock project', async ({
  request,
}) => {
  const res = await request.get('/api/project');
  expect(res.status()).toBe(200);

  const data: Array<{ uuid: string; name: string; inclusion_criteria: string, exclusion_criteria: string }> =
    await res.json();
  
  expect(data.length).toBe(1)

  expect(Array.isArray(data)).toBe(true);

  if (data.length > 0) {
    expect(data[0]).toHaveProperty('uuid');
    expect(data[0]).toHaveProperty('name');
    expect(data[0]).toHaveProperty('inclusion_criteria');
    expect(data[0]).toHaveProperty('exclusion_criteria')
  }

  const exists = data.some((p) => p.uuid === mockProject.uuid);
  expect(exists).toBe(true);
});

test('Fetch single project by UUID returns the correct record', async ({
  request,
}) => {
  const res = await request.get(`/api/project/${mockProject.uuid}`);
  expect(res.status()).toBe(200);

  const project = await res.json();
  expect(project.name).toBe(mockProject.name);
  expect(project.inclusion_criteria).toBe(mockProject.inclusion_criteria);
  expect(project.exclusion_criteria).toBe(mockProject.exclusion_criteria);
});

test('Create project returns 201 and returns the new project ID', async ({ request }) => {
  const res = await request.post('/api/project', {
    data: { name: 'Another Test Project', inclusion_criteria: 'New Test Inclusion Criteria', exclusion_criteria: 'New Test Exclusion Criteria' },
  });

  expect(res.status()).toBe(201);

  const uuid = await res.text();
  expect(typeof uuid).toBe('string');
  expect(uuid.length).toBeGreaterThan(0);
});
