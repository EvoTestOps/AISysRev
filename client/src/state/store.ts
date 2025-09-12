import {
  createStore,
  action,
  Action,
  createTypedHooks,
  Thunk,
  thunk,
  Computed,
  computed,
} from "easy-peasy";
import * as projectsService from "../services/projectService";
import * as paperService from "../services/paperService";
import { Paper, Project } from "./types";

const injections = {
  projectsService,
  paperService,
};

type LoadingModel = {
  loading: { projects: boolean; papers: Record<string, boolean> };
};

type ProjectUUID = string;

// Defines state, actions and thunks for project-related things.
interface ProjectModel {
  // Projects
  projects: Array<Project>;
  setProjects: Action<StoreModel, Array<Project>>;
  setLoadingProjects: Action<StoreModel, boolean>;
  fetchProjects: Thunk<StoreModel, undefined, Injections>;
  getProjectByUuid: Computed<
    StoreModel,
    (uuid: ProjectUUID) => Project | undefined,
    StoreModel
  >;
  refreshProjects: Thunk<StoreModel, undefined, Injections>;
}

interface PaperModel {
  // Papers are study-specific
  papers: Record<string, Array<Paper>>;
  setPapers: Action<StoreModel, { projectUuid: string; papers: Array<Paper> }>;
  fetchPapers: Thunk<StoreModel, ProjectUUID, Injections>;
  setLoadingPapers: Action<StoreModel, { projectUuid: string; state: boolean }>;
  getPapersForProject: Computed<
    StoreModel,
    (uuid: ProjectUUID) => Paper[],
    StoreModel
  >;
}

type StoreModel = {} & LoadingModel & ProjectModel & PaperModel;

export type Injections = typeof injections;

export const store = createStore<StoreModel>(
  {
    // Projects
    projects: [],
    setProjects: action((state, payload) => {
      state.projects = payload;
    }),
    setPapers: action((state, payload) => {
      state.papers[payload.projectUuid] = payload.papers;
    }),
    setLoadingProjects: action((state, payload) => {
      state.loading.projects = payload;
    }),
    setLoadingPapers: action((state, payload) => {
      state.loading.papers[payload.projectUuid] = payload.state;
    }),
    // This should be only called on-demand, as one project might contain tens of thousands of papers
    fetchPapers: thunk(async (actions, projectUuid, { injections }) => {
      actions.setLoadingPapers({ projectUuid, state: true });
      const { paperService } = injections;
      return paperService
        .fetchPapersWithModelEvalsForProject(projectUuid)
        .then((papers) => {
          actions.setPapers({ projectUuid, papers });
          actions.setLoadingPapers({ projectUuid, state: false });
        })
        .catch(console.error)
        .finally(() => actions.setLoadingPapers({ projectUuid, state: false }));
    }),
    fetchProjects: thunk(async (actions, _, { injections }) => {
      actions.setLoadingProjects(true);
      const { projectsService } = injections;
      return projectsService
        .fetch_projects()
        .then((p) => {
          actions.setProjects(p);
          actions.setLoadingProjects(false);
        })
        .catch(console.error)
        .finally(() => actions.setLoadingProjects(false));
    }),
    refreshProjects: thunk(async (actions) => {
      actions.setProjects([]);
      return actions.fetchProjects();
    }),
    getProjectByUuid: computed((state) => {
      return (uuid: string) => state.projects.find((p) => p.uuid === uuid);
    }),
    // Loading state
    loading: {
      projects: false,
      papers: {},
    },
    papers: {},
    getPapersForProject: computed((state) => {
      return (uuid: string) =>
        state.papers[uuid] === undefined ? [] : state.papers[uuid];
    }),
  },
  {
    injections,
    devTools: process.env.NODE_ENV !== "production",
  }
);

const typedHooks = createTypedHooks<StoreModel>();

export const useTypedStoreActions = typedHooks.useStoreActions;
export const useTypedStoreDispatch = typedHooks.useStoreDispatch;
export const useTypedStoreState = typedHooks.useStoreState;
