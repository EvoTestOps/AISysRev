import { api } from '../services/api'

export const fileFetchFromBackend = async (projectUuid: string) => {
  try {
    console.log("Fetching files for project UUID:", projectUuid);
    const res = await api.get(`/files/${projectUuid}`);
    console.log("Fetch successful:", res.data);
    return res.data;
  } catch (error) {
    console.log("File fetch error: ", error);
    throw error;
  }
};

export const fileUploadToBackend = async (files: File[], projectUuid: string) => {
  const formData = new FormData();

  formData.append("project_uuid", projectUuid);
  files.forEach((file) => formData.append("files", file));

  try {
    const res = await api.post(`/files/upload`, formData);

    return res.data;
  } catch (error){
    console.error("Backend upload error", error);
    throw error;
  }
};