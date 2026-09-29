// typed-openapi.config.ts
import { defineConfig } from "typed-openapi";

export default defineConfig({
  output: "./src/services/api/client.ts",
  runtime: "zod",
  validation: "strict",
  validateSide: "both",
  jsdoc: true,
  defaultFetcher: true,
  transformDates: true,
  format: true,
});