import { describe, expect, it } from "vitest";
import type { Project } from "./types/project";
import { createStore } from "easy-peasy";
import { model } from "./store";

const createProject = (uuid: string, name = "Project"): Project => ({
  uuid,
  name,
  criteria: { inclusion_criteria: [], exclusion_criteria: [] },
  preferences: null,
});

describe("ProjectModel", () => {
  it("Sets projects and gets project by UUID", () => {
    const store = createStore(model);
    const actions = store.getActions();

    const project = createProject("MOCK-UUID", "Test project");

    actions.setProjects([project]);

    expect(store.getState().projects).toEqual([project]);
    expect(store.getState().getProjectByUuid("MOCK-UUID")).toEqual(project);
    expect(store.getState().getProjectByUuid("MOCK-UUID-2")).toBeUndefined();
  });

  it("Updates loading state for projects", () => {
    const store = createStore(model);
    const actions = store.getActions();

    actions.setLoadingProjects(true);
    expect(store.getState().loading.projects).toBe(true);

    actions.setLoadingProjects(false);
    expect(store.getState().loading.projects).toBe(false);
  });
});
