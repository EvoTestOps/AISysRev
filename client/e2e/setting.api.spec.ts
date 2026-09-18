import { test, expect } from "@playwright/test";
import { loginAndConsent } from "./helpers/auth";
import { resetFixtures } from "./helpers/seed";

const prefix = "/api/v1";

test.describe("Setting API", () => {
  test.beforeEach(async ({ request }) => {
    await resetFixtures(request);
    await loginAndConsent(request);
  });

  test("Create, fetch and delete a setting", async ({ request }) => {
    const createRes = await request.post(`${prefix}/setting`, {
      data: { name: "openai_api_key", value: "sk-test-value" },
    });
    expect(createRes.status()).toBe(201);

    const getRes = await request.get(`${prefix}/setting?name=openai_api_key`);
    expect(getRes.status()).toBe(200);

    const deleteRes = await request.delete(`${prefix}/setting?name=openai_api_key`);
    expect(deleteRes.status()).toBe(200);

    const getAfterDelete = await request.get(`${prefix}/setting?name=openai_api_key`);
    expect(getAfterDelete.status()).toBe(404);
  });

  test("Fetching an unset setting returns 404", async ({ request }) => {
    const res = await request.get(`${prefix}/setting?name=does_not_exist`);
    expect(res.status()).toBe(404);
  });
});
