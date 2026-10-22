import { createApi } from "./api/api.client";

const getBaseUrl = () =>
  import.meta.env.VITE_API_BASE_URL !== undefined ? import.meta.env.VITE_API_BASE_URL : undefined;

// The typed client needs an absolute URL; fall back to the current origin like relative axios URLs do
export const api = createApi(getBaseUrl() ?? window.location.origin);
