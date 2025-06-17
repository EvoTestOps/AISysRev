// e2e/project-api.spec.ts
import { test, expect } from '@playwright/test';

let mockProject: { uuid: string; name: string; criteria: string };

test.beforeAll(async ({ request }) => {
  const createRes = await request.post('/api/project', {
    data: { name: 'Test Project', criteria: 'Test Criteria' },
  });
  expect(createRes.status(), 'project should be created').toBe(201);

  const listRes = await request.get('/api/project');
  expect(listRes.status()).toBe(200);
  const projects: Array<{ uuid: string; name: string; criteria: string }> =
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

  const data: Array<{ uuid: string; name: string; criteria: string }> =
    await res.json();

  expect(Array.isArray(data)).toBe(true);

  if (data.length > 0) {
    expect(data[0]).toHaveProperty('uuid');
    expect(data[0]).toHaveProperty('name');
    expect(data[0]).toHaveProperty('criteria');
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
  expect(project.criteria).toBe(mockProject.criteria);
});

test('Create project returns 201 and returns the new project ID', async ({ request }) => {
  const res = await request.post('/api/project', {
    data: { name: 'Another Test Project', criteria: 'New Test Criteria' },
  });

  expect(res.status()).toBe(201);

  const uuid = await res.text();
  expect(typeof uuid).toBe('string');
  expect(uuid.length).toBeGreaterThan(0);
});
