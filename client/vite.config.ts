import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

const appEnv = process.env.VITE_APP_ENV;

// https://vite.dev/config/
export default defineConfig({
  plugins: [wasm(), topLevelAwait(), react()],
  server: {
    open: false,
    port: 3000,
    proxy: {
      // This proxies API requests to the backend container
      "/api": `http://backend_${appEnv}:8080`,
      // Proxying documentation
      "/documentation": {
        target: `http://backend_${appEnv}:8080`,
        changeOrigin: true,
        rewrite: (path) => path.replace("/documentation", "/docs"),
      },
      "/openapi.json": `http://backend_${appEnv}:8080`,
    },
  },
});
