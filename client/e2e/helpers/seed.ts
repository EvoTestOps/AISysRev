import { APIRequestContext, expect } from "@playwright/test";

const prefix = "/api/v1";

export type SeededProject = {
  id: number;
  uuid: string;
};

export type SeededPaper = {
  uuid: string;
  paper_id: number;
  project_uuid: string;
  file_uuid: string | null;
  pdf_file_uuid: string | null;
  doi: string | null;
  title: string;
  abstract: string;
};

export async function resetFixtures(request: APIRequestContext): Promise<void> {
  const res = await request.post(`${prefix}/fixtures/reset`);
  expect(res.status(), "fixtures should reset").toBe(200);
}

export async function seedProjects(
  request: APIRequestContext,
  projects: Array<{
    name: string;
    criteria: { inclusion_criteria: string[]; exclusion_criteria: string[] };
  }>,
): Promise<SeededProject[]> {
  const res = await request.post(`${prefix}/project/batch`, { data: projects });
  expect(res.status(), "projects should be batch-created").toBe(201);
  return res.json();
}

export async function seedPapers(
  request: APIRequestContext,
  papers: Array<{
    project_uuid: string;
    paper_id: number;
    title: string;
    abstract: string;
    doi?: string | null;
    file_uuid?: string | null;
    pdf_file_uuid?: string | null;
  }>,
): Promise<SeededPaper[]> {
  const normalized = papers.map((p) => ({ doi: null, ...p }));
  const res = await request.post(`${prefix}/paper/batch`, { data: normalized });
  expect(res.status(), "papers should be batch-created").toBe(201);
  return res.json();
}

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * Files can only be created through the real upload endpoint (no batch-insert
 * shortcut exists for them), so seeding a file-backed paper set goes through
 * the actual CSV upload flow.
 */
export async function uploadCsvPapers(
  request: APIRequestContext,
  projectUuid: string,
  papers: Array<{ title: string; abstract: string; doi?: string }>,
  filename = "seed.csv",
): Promise<SeededPaper[]> {
  const rows = papers.map((p) =>
    [csvEscape(p.title), csvEscape(p.abstract), csvEscape(p.doi ?? "")].join(","),
  );
  const csv = ["title,abstract,doi", ...rows].join("\n") + "\n";

  const uploadRes = await request.post(`${prefix}/files/upload`, {
    multipart: {
      project_uuid: projectUuid,
      screening_target: "PAPER",
      files: { name: filename, mimeType: "text/csv", buffer: Buffer.from(csv) },
    },
  });
  expect(uploadRes.status(), "CSV should upload successfully").toBe(200);

  const papersRes = await request.get(`${prefix}/paper/${projectUuid}`);
  return papersRes.json();
}

export async function seedProjectWithPapers(
  request: APIRequestContext,
  projectName: string,
  paperCount: number,
): Promise<{ project: SeededProject; papers: SeededPaper[] }> {
  const [project] = await seedProjects(request, [
    {
      name: projectName,
      criteria: {
        inclusion_criteria: ["Test inclusion criteria"],
        exclusion_criteria: ["Test exclusion criteria"],
      },
    },
  ]);

  const papers = await uploadCsvPapers(
    request,
    project.uuid,
    Array.from({ length: paperCount }, (_, i) => ({
      title: `Seeded Paper ${i + 1}`,
      abstract: `Seeded abstract for paper ${i + 1}`,
      doi: `10.1234/seed${i + 1}`,
    })),
  );

  return { project, papers };
}
