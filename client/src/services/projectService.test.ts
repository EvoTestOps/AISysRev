import { afterAll, afterEach, beforeAll, describe, it, expect } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import * as projectService from "./projectService";
import type { Project } from "../state/types/project";

describe("Project service", () => {
  it("Fetches projects successfully", async () => {
    const projects = await projectService.fetch_projects();
    expect(projects.length).toBe(1);
    expect(projects[0].name).toBe("Test project 123");
    expect(projects[0].uuid).toBe("test-uuid");
  });
});

// https://vitest.dev/guide/mocking/requests.html
export const handlers = [
  // Get all projects
  http.get("http://localhost-vitest/api/v1/project", () => {
    return HttpResponse.json(
      [
        {
          uuid: "test-uuid",
          criteria: {
            inclusion_criteria: [],
            exclusion_criteria: [],
          },
          name: "Test project 123",
          preferences: {},
        } satisfies Project,
      ],
      { status: 200 },
    );
  }),
];

const server = setupServer(...handlers);

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

// Close server after all tests
afterAll(() => server.close());

// Reset handlers after each test for test isolation
afterEach(() => server.resetHandlers());
