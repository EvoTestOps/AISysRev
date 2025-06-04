import axios from 'axios';

export const fileUploadToBackend = async (files: File[]) => {
  const formData = new FormData();

  files.forEach((file) =>
    formData.append("file", file)
  );

  try {
    const res = await axios.post('/api/validate-csv', formData);
    return res.data;
  } catch (error){
    console.error("Backend upload error", error);
    
    throw error;
  }
};
