import { request } from "@playwright/test";
import { resetFixtures } from "./helpers/seed";

export default async function globalTeardown(): Promise<void> {
  // Browser contexts from the just-finished run may still be tearing down
  // long-lived /event-queue SSE connections, so give this extra headroom
  // instead of the default 30s.
  const context = await request.newContext({
    baseURL: "http://localhost:3002",
    timeout: 60 * 1000,
  });
  try {
    await resetFixtures(context);
  } finally {
    await context.dispose();
  }
}
