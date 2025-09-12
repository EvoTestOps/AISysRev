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
import { Project } from "./types";

const injections = {
  projectsService,
};

// Defines state, actions and thunks for project-related things.
interface ProjectModel {
  // Projects
  projects: Array<Project>;
  loadingProjects: boolean;
  setProjects: Action<StoreModel, Array<Project>>;
  setLoadingProjects: Action<StoreModel, boolean>;
  fetchProjects: Thunk<StoreModel, undefined, Injections>;
  getProjectByUuid: Computed<
    StoreModel,
    (uuid: string) => Project | undefined,
    StoreModel
  >;
}

type StoreModel = {} & ProjectModel;

export type Injections = typeof injections;

export const store = createStore<StoreModel>(
  {
    // Projects
    projects: [],
    loadingProjects: true,
    setProjects: action((state, payload) => {
      state.projects = payload;
    }),
    setLoadingProjects: action((state, payload) => {
      state.loadingProjects = payload;
    }),
    fetchProjects: thunk(async (actions, _, { injections }) => {
      actions.setLoadingProjects(true);
      const { projectsService } = injections;
      console.log("fetchProjects thunk called");
      return projectsService
        .fetch_projects()
        .then((p) => {
          actions.setProjects(p);
          actions.setLoadingProjects(false);
        })
        .catch(console.error);
    }),
    getProjectByUuid: computed((state) => {
      return (uuid: string) => state.projects.find((p) => p.uuid === uuid);
    }),
    // Etc.
  },
  {
    injections,
  }
);

const typedHooks = createTypedHooks<StoreModel>();

export const useTypedStoreActions = typedHooks.useStoreActions;
export const useTypedStoreDispatch = typedHooks.useStoreDispatch;
export const useTypedStoreState = typedHooks.useStoreState;
