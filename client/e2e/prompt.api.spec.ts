import { test, expect } from "@playwright/test";
import { loginAndConsent } from "./helpers/auth";
import { mockLlmConfig, waitForJobCompletion } from "./helpers/job";
import { seedProjectWithPapers, uniqueName } from "./helpers/seed";

const prefix = "/api/v1";

const USER_PROMPT = "Paper: {{title}}\n{{abstract}}\nCriteria:{{criteria}}";

test.describe("Prompt API", () => {
  test.beforeEach(async ({ request }) => {
    await loginAndConsent(request);
  });

  test("A job runs with the pinned prompt version and parallelism", async ({ request }) => {
    // Service errors come back as HTTP errors: an unknown variable, and editing a built-in prompt.
    const broken = { name: uniqueName("Broken"), prompting_type: "ZERO_SHOT", system_prompt: "" };
    const invalid = await request.post(`${prefix}/prompt`, {
      data: { ...broken, user_prompt: `${USER_PROMPT} {{bogus}}` },
    });
    expect(invalid.status()).toBe(422);
    const prompts = await (await request.get(`${prefix}/prompt?screening_target=PAPER`)).json();
    const builtIn = prompts.find((p: { is_default: boolean }) => p.is_default);
    const edit = await request.post(`${prefix}/prompt/${builtIn.uuid}/version`, {
      data: { system_prompt: "x", user_prompt: USER_PROMPT },
    });
    expect(edit.status()).toBe(403);

    const created = await request.post(`${prefix}/prompt`, {
      data: {
        name: uniqueName("Custom prompt"),
        prompting_type: "ZERO_SHOT",
        system_prompt: "You are a careful screener.",
        user_prompt: USER_PROMPT,
      },
    });
    expect(created.status()).toBe(201);
    const prompt = await created.json();
    const v2 = await (
      await request.post(`${prefix}/prompt/${prompt.uuid}/version`, {
        data: {
          system_prompt: "You are a very careful screener.",
          user_prompt: USER_PROMPT,
          change_note: "Stricter",
        },
      })
    ).json();
    expect(v2.versions.map((v: { version: number }) => v.version)).toEqual([2, 1]);

    const { project } = await seedProjectWithPapers(request, uniqueName("Prompt project"), 2);
    const jobRes = await request.post(`${prefix}/job`, {
      data: {
        project_uuid: project.uuid,
        llm_config: mockLlmConfig,
        prompting_config: {
          screening_type: "ZERO_SHOT",
          prompt_version_uuid: v2.latest_version.uuid,
        },
        screening_mode: "TEXT",
        max_parallel_calls: 3,
      },
    });
    expect(jobRes.status()).toBe(201);
    const job = await jobRes.json();
    expect(job.max_parallel_calls).toBe(3);
    expect(job.prompting_config.prompt_ref).toMatchObject({ name: prompt.name, version: 2 });

    expect(await waitForJobCompletion(request, job.uuid)).toBe("SUCCESS");

    const tasks = await (await request.get(`${prefix}/jobtask/${job.uuid}`)).json();
    const detail = await (
      await request.get(`${prefix}/job/${job.uuid}/task/${tasks[0].uuid}`)
    ).json();
    expect(detail.prompts[0].system_prompt).toBe("You are a very careful screener.");
    expect(detail.prompts[0].user_prompt).toContain("Paper: Seeded Paper");
    expect(detail.prompts[0].user_prompt).toContain("- IC1: Test inclusion criteria");
  });
});
