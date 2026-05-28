import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import basicSsl from "@vitejs/plugin-basic-ssl";

const appEnv = process.env.VITE_APP_ENV;

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait(),
    react(),
    ...(appEnv === "dev" ? [basicSsl()] : []),
  ],
  server: {
    open: false,
    port: 3000,
    proxy: {
      // This proxies API requests to the backend container
      "/api": `http://backend_${appEnv}:8080`,
      "/login": `http://backend_${appEnv}:8080`,
      "/register_and_privacy_policy": `http://backend_${appEnv}:8080`,
      // Proxying documentation
      "/docs": {
        target: `http://backend_${appEnv}:8080`,
      },
      "/openapi.json": `http://backend_${appEnv}:8080`,
    },
  },
});
