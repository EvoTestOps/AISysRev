import axios from 'axios';


const prefix = '/api/v1';

export const fileFetchFromBackend = async (projectUuid: string) => {
  try {
    const res = await axios.get(`${prefix}/files/${projectUuid}`);
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
    const res = await axios.post(`${prefix}/files/upload`, formData);

    return res.data;
  } catch (error){
    console.error("File upload error", error);
    throw error;
  }
};