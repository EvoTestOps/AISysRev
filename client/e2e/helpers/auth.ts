import { APIRequestContext, Page } from "@playwright/test";
import { expect } from "@playwright/test";

const prefix = "/api/v1";

/**
 * Playwright sets TEST_PARALLEL_INDEX per worker process, so each parallel
 * worker logs in as its own isolated dev user instead of sharing one account.
 */
function workerId(): string {
  return process.env.TEST_PARALLEL_INDEX ?? "0";
}

export async function loginAndConsent(request: APIRequestContext): Promise<void> {
  await request.get(`${prefix}/auth/dev-login?worker=${workerId()}`);

  const consentRes = await request.post(`${prefix}/auth/consent`, {
    data: {
      terms: true,
      privacy_policy: true,
      research: true,
    },
  });
  expect(consentRes.status(), "consent should be accepted").toBe(201);

  const meRes = await request.get(`${prefix}/auth/me`);
  expect(meRes.status(), "should be authenticated after dev-login").toBe(200);
}

export async function loginAndConsentUI(page: Page): Promise<void> {
  await loginAndConsent(page.request);
}
