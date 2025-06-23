import axios from 'axios';

export const fileUploadToBackend = async (files: File[], projectId: string) => {
  const formData = new FormData();

  files.forEach((file) =>
    formData.append("files", file)
  );

  try {
    const res = await axios.post('/api/files/upload', formData);
    console.log("Upload successful:", res.data);
    return res.data;
  } catch (error){
    console.error("Backend upload error", error);
    
    throw error;
  }
};
