import axios from 'axios';
import { JobTaskResult } from '../state/types';

const prefix = '/api/v1';

export const fetchJobTasksFromBackend = async (jobUuid: string) => {
  try {
    const res = await axios.get(`${prefix}/jobtask/${jobUuid}`);
    return res.data;
  } catch (error) {
    console.error("Error fetching job tasks:", error);
    console.error("Request URL:", `${prefix}/jobtask/${jobUuid}`);
    throw error;
  }
};

export const fetchJobTaskByUuid = async (jobTaskUuid: string) => {
  try {
    const res = await axios.get(`${prefix}/jobtask/${jobTaskUuid}`);
    return res.data;
  } catch (error) {
    console.error("Error fetching job task by UUID:", error);
    throw error;
  }
};

export const addJobTaskResult = async (jobTaskUuid: string, result: JobTaskResult) => {
  try {
    const res = await axios.post(`${prefix}/jobtask/${jobTaskUuid}`, result);
    return res.data;
  } catch (error) {
    console.error("Error adding job task result:", error);
    throw error;
  }
};