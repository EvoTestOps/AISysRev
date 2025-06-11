import axios from 'axios';

export const fileUploadToBackend = async (files: File[]) => {
  const formData = new FormData();

  files.forEach((file) =>
    formData.append("files", file)
  );

  try {
    const res = await axios.post('/api/process-csv', formData);
    console.log("Upload successful:", res.data);
    return res.data;
  } catch (error){
    console.error("Backend upload error", error);
    
    throw error;
  }
};
