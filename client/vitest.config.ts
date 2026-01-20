import { configDefaults, defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
    },
    exclude: [...configDefaults.exclude, "e2e/*"],
    projects: [
      {
        test: {
          include: ["src/**/*.test.ts"],
          name: "unit",
          environment: "node",
          setupFiles: ["./vitest.setup.ts"],
        },
      },
      {
        test: {
          include: ["src/**/*.test.tsx"],
          name: "browser",
          setupFiles: ["./vitest.setup.ts"],
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
            headless: true,
            screenshotDirectory: "__screenshots__",
          },
        },
      },
    ],
  },
});
