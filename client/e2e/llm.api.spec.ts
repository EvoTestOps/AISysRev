import { test, expect } from "@playwright/test";
import { loginAndConsent } from "./helpers/auth";
import { resetFixtures } from "./helpers/seed";

const prefix = "/api/v1";

test.describe("LLM API", () => {
  test.beforeEach(async ({ request }) => {
    await resetFixtures(request);
    await loginAndConsent(request);
  });

  test("List providers includes the mock provider", async ({ request }) => {
    const res = await request.get(`${prefix}/llm/providers`);
    expect(res.status()).toBe(200);
    const providers = await res.json();
    const mock = providers.find((p: { name: string }) => p.name === "mock");
    expect(mock).toBeTruthy();
    expect(mock.title).toBe("Mock (Local)");
  });

  test("Provider config params includes mock provider metadata", async ({
    request,
  }) => {
    const res = await request.get(`${prefix}/llm/provider_config_params`);
    expect(res.status()).toBe(200);
    const params = await res.json();
    expect(params).toHaveProperty("mock");
  });

  test("List available models for the mock provider", async ({ request }) => {
    const res = await request.post(`${prefix}/llm/mock/models`, { data: {} });
    expect(res.status()).toBe(200);
    const models = await res.json();
    expect(Array.isArray(models)).toBe(true);
    expect(models.some((m: { id: string }) => m.id === "mock_001")).toBe(true);
  });

  test("Unknown provider returns 404", async ({ request }) => {
    const res = await request.post(`${prefix}/llm/does-not-exist/models`, {
      data: {},
    });
    expect(res.status()).toBe(404);
  });
});
