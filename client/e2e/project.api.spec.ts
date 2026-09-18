import { test, expect } from "@playwright/test";
import { loginAndConsent } from "./helpers/auth";
import { seedProjects, uniqueName } from "./helpers/seed";

const prefix = "/api/v1";

test.describe("Project API", () => {
  let mockProject: {
    uuid: string;
    name: string;
    criteria: {
      inclusion_criteria: string[];
      exclusion_criteria: string[];
    };
  };

  test.beforeEach(async ({ request }) => {
    await loginAndConsent(request);

    const projectName = uniqueName("Test Project");
    const createRes = await request.post(`${prefix}/project`, {
      data: {
        name: projectName,
        criteria: {
          inclusion_criteria: ["Test inclusion criteria"],
          exclusion_criteria: ["Test exclusion criteria"],
        },
      },
    });
    expect(createRes.status(), "project should be created").toBe(201);

    const listRes = await request.get(`${prefix}/project`);
    expect(listRes.status()).toBe(200);
    const projects = await listRes.json();

    const found = projects.find(
      (p: { name: string }) => p.name === projectName,
    );
    expect(found, "created project should be in list").toBeTruthy();

    mockProject = found;
  });

  test("Fetch all projects returns 200 and an array containing the mock project", async ({
    request,
  }) => {
    const res = await request.get(`${prefix}/project`);
    expect(res.status()).toBe(200);

    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    const found = data.find((p: { uuid: string }) => p.uuid === mockProject.uuid);
    expect(found, "created project should be in the list").toBeTruthy();
    expect(found).toHaveProperty("name");
    expect(found).toHaveProperty("criteria");
    expect(found.criteria).toHaveProperty("inclusion_criteria");
    expect(found.criteria).toHaveProperty("exclusion_criteria");
  });

  test("Fetch single project by UUID returns the correct record", async ({
    request,
  }) => {
    const res = await request.get(`${prefix}/project/${mockProject.uuid}`);
    expect(res.status()).toBe(200);

    const project = await res.json();
    expect(project.name).toBe(mockProject.name);
    expect(project.criteria.inclusion_criteria).toEqual(
      mockProject.criteria.inclusion_criteria,
    );
    expect(project.criteria.exclusion_criteria).toEqual(
      mockProject.criteria.exclusion_criteria,
    );
  });

  test("Create project returns 201 and returns the new project ID", async ({
    request,
  }) => {
    const res = await request.post(`${prefix}/project`, {
      data: {
        name: uniqueName("Another Test Project"),
        criteria: {
          inclusion_criteria: ["New Test Inclusion Criteria"],
          exclusion_criteria: ["New Test Exclusion Criteria"],
        },
      },
    });

    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(typeof body.uuid).toBe("string");
    expect(body.uuid.length).toBeGreaterThan(0);
  });

  test("Delete project removes it from the list", async ({ request }) => {
    const res = await request.delete(`${prefix}/project/${mockProject.uuid}`);
    expect(res.status()).toBe(200);

    const listRes = await request.get(`${prefix}/project`);
    const projects = await listRes.json();
    expect(
      projects.some((p: { uuid: string }) => p.uuid === mockProject.uuid),
    ).toBe(false);
  });

  test("Batch create projects returns created records with UUIDs", async ({
    request,
  }) => {
    const res = await request.post(`${prefix}/project/batch`, {
      data: [
        {
          name: uniqueName("Batch Project 1"),
          criteria: {
            inclusion_criteria: ["IC1"],
            exclusion_criteria: ["EC1"],
          },
        },
        {
          name: uniqueName("Batch Project 2"),
          criteria: {
            inclusion_criteria: ["IC2"],
            exclusion_criteria: ["EC2"],
          },
        },
      ],
    });
    expect(res.status()).toBe(201);
    const created = await res.json();
    expect(created.length).toBe(2);
    for (const project of created) {
      expect(typeof project.uuid).toBe("string");
    }
  });

  test("Batch delete projects only removes the caller's own projects", async ({
    request,
  }) => {
    const created = await seedProjects(request, [
      {
        name: uniqueName("Batch Delete Me"),
        criteria: { inclusion_criteria: ["IC"], exclusion_criteria: ["EC"] },
      },
    ]);

    const res = await request.delete(`${prefix}/project/batch`, {
      data: [created[0].uuid, "00000000-0000-0000-0000-000000000000"],
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.deleted).toEqual([created[0].uuid]);

    const getRes = await request.get(`${prefix}/project/${created[0].uuid}`);
    expect(getRes.status()).toBe(404);
  });
});
