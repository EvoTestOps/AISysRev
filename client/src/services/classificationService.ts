import { api } from "./api";
import type {
  ClassificationConfig,
  ClassificationConfigCreate,
  CreatedClassificationConfig,
} from "../state/types/classification";

export const fetch_classification_configs = async (
  projectUuid: string
): Promise<ClassificationConfig[]> => {
  try {
    const res = await api.get(
      `/api/v1/projects/${projectUuid}/classification-configs`
    );
    return res.data;
  } catch (error) {
    console.error("Fetching classification configs unsuccessful", error);
    throw error;
  }
};

export const fetch_classification_config_by_uuid = async (
  uuid: string
): Promise<ClassificationConfig> => {
  try {
    const res = await api.get(`/api/v1/classification-config/${uuid}`);
    return res.data;
  } catch (error) {
    console.error("Fetching classification config by UUID unsuccessful", error);
    throw error;
  }
};

export const create_classification_config = async (
  data: ClassificationConfigCreate
): Promise<CreatedClassificationConfig> => {
  try {
    const res = await api.post("/api/v1/classification-config", data);
    return res.data;
  } catch (error) {
    console.error("Creating classification config unsuccessful", error);
    throw error;
  }
};

export const delete_classification_config = async (
  uuid: string
): Promise<{ detail: string }> => {
  try {
    const res = await api.delete(`/api/v1/classification-config/${uuid}`);
    return res.data;
  } catch (error) {
    console.error("Deleting classification config unsuccessful", error);
    throw error;
  }
};
