import axios from "axios";

export const api = axios.create({
  baseURL:
    process.env.VITEST === "true" ? "http://localhost-vitest/api/v1" : "/api/v1",
});
