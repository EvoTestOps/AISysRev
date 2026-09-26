import axios from "axios";
import { createApi } from "./api/api.client";

const getBaseUrl = () =>
  import.meta.env.VITE_API_BASE_URL !== undefined ? import.meta.env.VITE_API_BASE_URL : undefined;

// TODO: Refactor this out when code has been migrated
export const createLegacyApi = (baseURL = getBaseUrl()) => axios.create({ baseURL });

export const legacyApi = createLegacyApi();
// The typed client needs an absolute URL; fall back to the current origin like relative axios URLs do
export const api = createApi(getBaseUrl() ?? window.location.origin);
