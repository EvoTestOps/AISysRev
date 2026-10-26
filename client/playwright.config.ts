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
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Limit parallel tests on CI */
  workers: process.env.CI ? 3 : undefined,
  /* Retry on CI only */
  retries: 2,
  /* 30 seconds */
  timeout: 30 * 1000,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: "https://localhost:3002",
    /* The test stack's Caddy serves a certificate from its own internal CA. */
    ignoreHTTPSErrors: true,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",

    /* Turn off the app's entrance animations (riseIn/fadeIn honour this). While
     * the task form rises into place, an open MUI menu re-anchors to it on every
     * re-render, so a menu option can move between mousedown and mouseup: the
     * click is then lost although Playwright reports it done. */
    reducedMotion: "reduce",
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
      /* Desktop Safari defaults to a 2x device scale factor. Headless WebKit on
       * Linux paints in software, so at 2x it renders about one frame a second
       * on CI. Playwright's "stable" check waits for animation frames, so each
       * click then takes seconds and long flows (few-shot, ZDR) time out. */
      use: { ...devices["Desktop Safari"], deviceScaleFactor: 1 },
    },
  ],

  /* Start the test stack (the production images, see docker-compose-e2e.yml)
   * before the tests, unless one is already running locally. Its output goes to
   * client/playwright-webserver.log so it doesn't drown out the test output. */
  webServer: {
    command: "make start-test > client/playwright-webserver.log 2>&1",
    cwd: "../",
    url: "https://localhost:3002/api/v1/health",
    ignoreHTTPSErrors: true,
    reuseExistingServer: !process.env.CI,
    timeout: 240 * 1000,
    gracefulShutdown: {
      signal: "SIGINT",
      timeout: 20 * 1000,
    },
  },
});
