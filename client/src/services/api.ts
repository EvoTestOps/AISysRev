import axios from "axios";

const getBaseUrl = () =>
  import.meta.env.VITE_API_BASE_URL !== undefined
    ? import.meta.env.VITE_API_BASE_URL
    : undefined;

export const createApi = (baseURL = getBaseUrl()) => axios.create({ baseURL });

export const api = createApi();
