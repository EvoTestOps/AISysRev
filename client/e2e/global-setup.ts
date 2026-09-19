import { request } from "@playwright/test";
import { resetFixtures } from "./helpers/seed";

export default async function globalSetup(): Promise<void> {
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
