import { api } from "../services/api";

export const fileFetchFromBackend = async (projectUuid: string) => {
  try {
    // console.log("Fetching files for project UUID:", projectUuid);
    const res = await api.get(`/api/v1/files/${projectUuid}`);
    // console.log("Fetch successful:", res.data);
    return res.data;
  } catch (error) {
    console.error("File fetch error: ", error);
    throw error;
  }
};

export const fileUploadToBackend = async (
  files: File[],
  projectUuid: string,
) => {
  const formData = new FormData();

  formData.append("project_uuid", projectUuid);
  files.forEach((file) => formData.append("files", file));

  try {
    const res = await api.post(`/api/v1/files/upload`, formData);
    return res.data;
  } catch (error) {
    console.error("Backend upload error", error);
    throw error;
  }
};

export const pdfUploadToBackend = async (
  files: File[],
  projectUuid: string,
) => {
  const formData = new FormData();

  formData.append("project_uuid", projectUuid);
  files.forEach((file) => formData.append("files", file));

  try {
    const res = await api.post(`/api/v1/files/upload-pdfs`, formData);
    return res.data;
  } catch (error) {
    console.error("Backend PDF upload error", error);
    throw error;
  }
};

export const attachPdfToPaper = async (
  paperUuid: string,
  file: File,
) => {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await api.post(`/api/v1/files/${paperUuid}/attach-pdf`, formData);
    return res.data;
  } catch (error) {
    console.error("Backend attach PDF error", error);
    throw error;
  }
};
