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
import * as providerService from "../services/providerService";
import {
  JobTaskHumanResult,
  PaperWithModelEval,
  Project,
  Provider,
} from "./types";

const injections = {
  projectsService,
  paperService,
  providerService,
};

type LoadingModel = {
  loading: {
    projects: boolean;
    papers: Record<string, boolean>;
    providers: boolean;
  };
};

type ProjectUUID = string;

// Defines state, actions and thunks for project-related things.
interface ProjectModel {
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
  papers: Record<string, Array<PaperWithModelEval>>;
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
  getPaperByUuid: Computed<
    StoreModel,
    (projectUuid: string, paperUuid: string) => PaperWithModelEval | undefined,
    StoreModel
  >;
  getPaperPendingState: Computed<
    StoreModel,
    (paperUuid: string) => boolean,
    StoreModel
  >;
}

interface ProviderModel {
  // Projects
  providers: Array<Provider>;
  setProviders: Action<StoreModel, Array<Provider>>;
  setLoadingProviders: Action<StoreModel, boolean>;
  fetchProviders: Thunk<StoreModel, undefined, Injections>;
  getProviderByName: Computed<
    StoreModel,
    (name: string) => Provider | undefined,
    StoreModel
  >;
  refreshProviders: Thunk<StoreModel, undefined, Injections>;
}

type StoreModel = {} & LoadingModel & ProjectModel & PaperModel & ProviderModel;

export type Injections = typeof injections;

export const model = {
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
      params.humanResult,
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
    providers: false,
    papers: {},
  },
  papers: {},
  papersPendingState: {},
  getPapersForProject: computed((state) => {
    return (uuid: string) =>
      state.papers[uuid] === undefined ? [] : state.papers[uuid];
  }),
  getPaperPendingState: computed((state) => {
    return (paperUuid: string) => state.papersPendingState[paperUuid] || false;
  }),
  getPaperByUuid: computed((state) => {
    return (projectUuid: string, paperUuid: string) =>
      (state.papers[projectUuid] || []).find(
        (paper) => paper.uuid === paperUuid,
      );
  }),
  providers: [],
  fetchProviders: thunk(async (actions, _, { injections }) => {
    actions.setLoadingProviders(true);
    const { providerService } = injections;
    return providerService
      .fetchProviders()
      .then((p) => {
        actions.setProviders(p);
        actions.setLoadingProviders(false);
      })
      .catch(console.error)
      .finally(() => actions.setLoadingProviders(false));
  }),
  refreshProviders: thunk(async (actions) => {
    actions.setProviders([]);
    return actions.fetchProviders();
  }),
  setProviders: action((state, payload) => {
    state.providers = payload;
  }),
  setLoadingProviders: action((state, payload) => {
    state.loading.providers = payload;
  }),
  getProviderByName: computed((state) => {
    return (name: string) =>
      (state.providers || []).find((provider) => provider.name === name);
  }),
} satisfies StoreModel;

export const store = createStore<StoreModel>(model, {
  injections,
  devTools: process.env.NODE_ENV !== "production",
});

const typedHooks = createTypedHooks<StoreModel>();

export const useTypedStoreActions = typedHooks.useStoreActions;
export const useTypedStoreDispatch = typedHooks.useStoreDispatch;
export const useTypedStoreState = typedHooks.useStoreState;
