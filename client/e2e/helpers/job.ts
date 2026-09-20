import { APIRequestContext, expect } from "@playwright/test";

const prefix = "/api/v1";

export const mockLlmConfig = {
  provider_name: "mock",
  model_name: "mock-small",
  provider_parameters: {},
  model_parameters: {},
};

export async function createZeroShotMockJob(
  request: APIRequestContext,
  projectUuid: string,
): Promise<{ uuid: string; project_uuid: string }> {
  const res = await request.post(`${prefix}/job`, {
    data: {
      project_uuid: projectUuid,
      llm_config: mockLlmConfig,
      prompting_config: { screening_type: "ZERO_SHOT" },
      screening_mode: "TEXT",
    },
  });
  expect(res.status(), "job should be created").toBe(201);
  return res.json();
}

export async function waitForJobCompletion(
  request: APIRequestContext,
  jobUuid: string,
  timeoutMs = 30000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  let lastStatus = "NOT_STARTED";
  while (Date.now() < deadline) {
    const res = await request.get(`${prefix}/job/${jobUuid}`);
    expect(res.status()).toBe(200);
    const statsRes = await request.get(`${prefix}/job`);
    const jobs = await statsRes.json();
    const job = jobs.find((j: { uuid: string }) => j.uuid === jobUuid);
    lastStatus = job?.stats?.status ?? lastStatus;
    if (["SUCCESS", "PARTIAL_SUCCESS", "FAILED"].includes(lastStatus)) {
      return lastStatus;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Job ${jobUuid} did not complete in time (last status: ${lastStatus})`);
}
