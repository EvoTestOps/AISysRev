import { defineConfig, devices } from "@playwright/test";

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./e2e",
  /* Reset fixtures once before the run and once after, instead of per-test */
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: 4,
  /* 30 seconds */
  timeout: 30 * 1000,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: "http://localhost:3002",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  /* *.api.spec.ts tests only use the `request` fixture and never touch a
   * browser, so they run once here instead of being tripled across every
   * browser project below (which would needlessly multiply load on the
   * shared backend/celery/DB stack). *.e2e.spec.ts tests drive a real page
   * and run across all three browser engines. */
  projects: [
    {
      name: "api",
      testMatch: /.*\.api\.spec\.ts/,
    },
    {
      name: "chromium",
      testMatch: /.*\.e2e\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      testMatch: /.*\.e2e\.spec\.ts/,
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      testMatch: /.*\.e2e\.spec\.ts/,
      use: { ...devices["Desktop Safari"] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "make start-test",
    cwd: "../",
    url: "http://localhost:3002/api/v1/health",
    reuseExistingServer: !process.env.CI,
    timeout: 60 * 1000,
    gracefulShutdown: {
      signal: "SIGINT",
      timeout: 20 * 1000,
    },
  },
});
