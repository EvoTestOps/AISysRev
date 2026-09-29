import { afterAll, afterEach, beforeAll, describe, it, expect } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import * as projectService from "./projectService";
import type { z } from "zod";
import type { ProjectRead } from "./api/client";
import { ScreeningTarget } from "../state/types";

describe("Project service", () => {
  it("Fetches projects successfully", async () => {
    const projects = await projectService.fetch_projects();
    expect(projects.length).toBe(1);
    expect(projects[0].name).toBe("Test project 123");
    expect(projects[0].uuid).toBe("5b1d2c3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e");
  });
});

// https://vitest.dev/guide/mocking/requests.html
export const handlers = [
  // Get all projects
  http.get(`${process.env.VITE_API_BASE_URL}/api/v1/project`, () => {
    return HttpResponse.json(
      [
        {
          uuid: "5b1d2c3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e",
          criteria: {
            inclusion_criteria: [],
            exclusion_criteria: [],
          },
          name: "Test project 123",
          preferences: null,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
          screening_target: ScreeningTarget.PAPER,
        } satisfies z.input<typeof ProjectRead>,
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
