import { api } from "../services/api";
import { Criteria, Project } from "../state/types";

// TODO: Zod type guard
export const fetch_projects = async (): Promise<Project[]> => {
  try {
    const res = await api.get("/project");
    console.log("Fetching projects successful", res.data);
    return res.data;
  } catch (error) {
    console.log("Fetching projects unsuccessful", error);
    throw error;
  }
};

export const fetch_project_by_uuid = async (uuid: string) => {
  try {
    const res = await api.get(`/project/${uuid}`);
    return res.data;
  } catch (error) {
    console.log("Fetching project by UUID unsuccessful", error);
    throw error;
  }
};

export const create_project = async (title: string, criteria: Criteria) => {
  try {
    console.log("Creating project with title:", title);
    const res = await api.post("/project", {
      name: title,
      criteria: criteria,
    });
    return res.data;
  } catch (error) {
    console.log("Creating project unsuccessful", error);
    throw error;
  }
};

export const delete_project = async (uuid: string) => {
  try {
    const res = await api.delete(`/project/${uuid}`);
    return res.data;
  } catch (error) {
    console.log("Deleting project unsuccessful", error);
    throw error;
  }
};
