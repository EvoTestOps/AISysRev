import z from "zod";
import { api } from "../services/api";
import type {
  CreatedProject,
  Criteria,
  DeletedProject,
  Project,
} from "../state/types/project";
import {
  CreatedProjectModel,
  DeletedProjectModel,
  ProjectModel,
} from "../state/types/project";
import {ScreeningTarget} from "../state/types";

export const fetch_projects = async (): Promise<Project[]> => {
  try {
    const res = await api.get("/api/v1/project");
    return z.array(ProjectModel).parse(res.data);
  } catch (error) {
    console.error("Fetching projects unsuccessful", error);
    throw error;
  }
};

export const fetch_project_by_uuid = async (uuid: string): Promise<Project> => {
  try {
    const res = await api.get(`/api/v1/project/${uuid}`);
    return ProjectModel.parse(res.data);
  } catch (error) {
    console.error("Fetching project by UUID unsuccessful", error);
    throw error;
  }
};

export const create_project = async (
  title: string,
  criteria: Criteria,
  screeningTarget: ScreeningTarget,
): Promise<CreatedProject> => {
  try {
    const res = await api.post("/api/v1/project", {
      name: title,
      criteria: criteria,
      screening_target: screeningTarget,
    });
    return CreatedProjectModel.parse(res.data);
  } catch (error) {
    console.error("Creating project unsuccessful", error);
    throw error;
  }
};

export const delete_project = async (uuid: string): Promise<DeletedProject> => {
  try {
    const res = await api.delete(`/api/v1/project/${uuid}`);
    return DeletedProjectModel.parse(res.data);
  } catch (error) {
    console.error("Deleting project unsuccessful", error);
    throw error;
  }
};
