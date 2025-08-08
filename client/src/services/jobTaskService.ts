import axios from 'axios';

const prefix = '/api/v1';

export const fetchJobTaskByUuid = async (jobTaskUuid: string) => {
  try {
    const res = await axios.get(`${prefix}/jobtask/${jobTaskUuid}`);
    return res.data;
  } catch (error) {
    console.error("Error fetching job task by UUID:", error);
    throw error;
  }
};
