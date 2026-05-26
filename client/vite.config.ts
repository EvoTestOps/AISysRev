import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import basicSsl from "@vitejs/plugin-basic-ssl";

const appEnv = process.env.VITE_APP_ENV;

const authRedirect = (): Plugin => ({
  name: "auth-redirect",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = req.url ?? "/";
      const isPublic = ["/login", "/api", "/privacy-policy"].some((p) =>
        url.startsWith(p)
      );
      const isAsset =
        /\.\w+$/.test(url) ||
        url.startsWith("/@") ||
        url.startsWith("/node_modules");
      const hasCookie = req.headers.cookie?.includes("session_id");
      if (!isPublic && !isAsset && !hasCookie) {
        res.writeHead(302, { Location: "/login" });
        res.end();
        return;
      }
      next();
    });
  },
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait(),
    react(),
    authRedirect(),
    ...(appEnv === "dev" ? [basicSsl()] : []),
  ],
  server: {
    open: false,
    port: 3000,
    proxy: {
      // This proxies API requests to the backend container
      "/api": `http://backend_${appEnv}:8080`,
      "/login": `http://backend_${appEnv}:8080`,
      "/privacy-policy": `http://backend_${appEnv}:8080`,
      // Proxying documentation
      "/docs": {
        target: `http://backend_${appEnv}:8080`,
      },
      "/openapi.json": `http://backend_${appEnv}:8080`,
    },
  },
});
