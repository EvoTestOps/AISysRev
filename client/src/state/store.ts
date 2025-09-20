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
import {
  JobTaskHumanResult,
  Paper,
  PaperWithModelEval,
  Project,
} from "./types";

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
  papersPendingState: Record<string, boolean>;
  setPapers: Action<
    StoreModel,
    { projectUuid: string; papers: Array<PaperWithModelEval> }
  >;
  setPaperPendingState: Action<
    StoreModel,
    { paperUuid: string; pending: boolean }
  >;
  fetchPapers: Thunk<StoreModel, ProjectUUID, Injections>;
  setPaperPending: Action<StoreModel, { projectUuid: string; state: boolean }>;
  // TODO: It might be wise to create a JobTaskModel for handling job task related stuff..
  setPaperHumanResult: Action<
    StoreModel,
    { projectUuid: string; paperUuid: string; humanResult: JobTaskHumanResult }
  >;
  addHumanResult: Thunk<
    StoreModel,
    { projectUuid: string; paperUuid: string; humanResult: JobTaskHumanResult },
    Injections
  >;
  getPapersForProject: Computed<
    StoreModel,
    (uuid: ProjectUUID) => PaperWithModelEval[],
    StoreModel
  >;
  getPaperPendingState: Computed<
    StoreModel,
    (paperUuid: string) => boolean,
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
    setPaperPending: action((state, payload) => {
      state.loading.papers[payload.projectUuid] = payload.state;
    }),
    // This should be only called on-demand, as one project might contain tens of thousands of papers
    fetchPapers: thunk(async (actions, projectUuid, { injections }) => {
      actions.setPaperPending({ projectUuid, state: true });
      const { paperService } = injections;
      return paperService
        .fetchPapersWithModelEvalsForProject(projectUuid)
        .then((papers) => {
          actions.setPapers({ projectUuid, papers });
          actions.setPaperPending({ projectUuid, state: false });
        })
        .catch(console.error)
        .finally(() => actions.setPaperPending({ projectUuid, state: false }));
    }),
    setPaperPendingState: action((state, payload) => {
      state.papersPendingState[payload.paperUuid] = payload.pending;
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
    addHumanResult: thunk(async (actions, params, { injections }) => {
      actions.setPaperPendingState({
        paperUuid: params.paperUuid,
        pending: true,
      });
      const { paperService } = injections;
      await paperService.addPaperHumanResult(
        params.paperUuid,
        params.humanResult
      );
      actions.setPaperHumanResult({
        projectUuid: params.projectUuid,
        paperUuid: params.paperUuid,
        humanResult: params.humanResult,
      });
      actions.setPaperPendingState({
        paperUuid: params.paperUuid,
        pending: false,
      });
    }),
    setPaperHumanResult: action((state, payload) => {
      const { projectUuid, paperUuid, humanResult } = payload;
      const projectPapers = state.papers[projectUuid];
      if (!projectPapers) return;
      const paperIndex = projectPapers.findIndex((p) => p.uuid === paperUuid);
      if (paperIndex === -1) return;
      projectPapers[paperIndex] = {
        ...projectPapers[paperIndex],
        human_result: humanResult,
      };
    }),
    // Loading state
    loading: {
      projects: false,
      papers: {},
    },
    papers: {},
    papersPendingState: {},
    getPapersForProject: computed((state) => {
      return (uuid: string) =>
        state.papers[uuid] === undefined ? [] : state.papers[uuid];
    }),
    getPaperPendingState: computed((state) => {
      return (paperUuid: string) =>
        state.papersPendingState[paperUuid] || false;
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
