import { test, expect } from "@playwright/test";
import { loginAndConsent } from "./helpers/auth";
import { seedProjects } from "./helpers/seed";

const prefix = "/api/v1";

const VALID_CSV = "title,abstract,doi\nPaper One,Abstract one,10.1234/one\n";

test.describe("File API", () => {
  let projectUuid: string;

  test.beforeEach(async ({ request }) => {
    await loginAndConsent(request);
    const [project] = await seedProjects(request, [
      {
        name: "File Test Project",
        criteria: { inclusion_criteria: ["IC1"], exclusion_criteria: ["EC1"] },
      },
    ]);
    projectUuid = project.uuid;
  });

  test("Upload a CSV creates a file and associated papers", async ({ request }) => {
    const res = await request.post(`${prefix}/files/upload`, {
      multipart: {
        project_uuid: projectUuid,
        screening_target: "PAPER",
        files: {
          name: "papers.csv",
          mimeType: "text/csv",
          buffer: Buffer.from(VALID_CSV),
        },
      },
    });
    expect(res.status()).toBe(200);

    const filesRes = await request.get(`${prefix}/files/${projectUuid}`);
    const files = await filesRes.json();
    expect(files.length).toBe(1);
    expect(files[0].filename).toBe("papers.csv");

    const papersRes = await request.get(`${prefix}/paper/${projectUuid}`);
    const papers = await papersRes.json();
    expect(papers.length).toBe(1);
    expect(papers[0].title).toBe("Paper One");
  });

  test("Only one file allowed per project", async ({ request }) => {
    const first = await request.post(`${prefix}/files/upload`, {
      multipart: {
        project_uuid: projectUuid,
        screening_target: "PAPER",
        files: {
          name: "papers.csv",
          mimeType: "text/csv",
          buffer: Buffer.from(VALID_CSV),
        },
      },
    });
    expect(first.status()).toBe(200);

    const second = await request.post(`${prefix}/files/upload`, {
      multipart: {
        project_uuid: projectUuid,
        screening_target: "PAPER",
        files: {
          name: "papers2.csv",
          mimeType: "text/csv",
          buffer: Buffer.from(VALID_CSV),
        },
      },
    });
    expect(second.status()).toBe(400);
  });

  test("Download an uploaded PDF returns its content", async ({ request }) => {
    const uploadRes = await request.post(`${prefix}/files/upload-pdfs`, {
      multipart: {
        project_uuid: projectUuid,
        files: {
          name: "paper.pdf",
          mimeType: "application/pdf",
          buffer: Buffer.from("%PDF-1.4\n%mock pdf content\n"),
        },
      },
    });
    expect(uploadRes.status()).toBe(200);

    const filesRes = await request.get(`${prefix}/files/${projectUuid}`);
    const [file] = await filesRes.json();

    const downloadRes = await request.get(`${prefix}/files/${file.uuid}/download`);
    expect(downloadRes.status()).toBe(200);
  });

  test("Batch delete files removes uploaded files", async ({ request }) => {
    const uploadRes = await request.post(`${prefix}/files/upload`, {
      multipart: {
        project_uuid: projectUuid,
        screening_target: "PAPER",
        files: {
          name: "papers.csv",
          mimeType: "text/csv",
          buffer: Buffer.from(VALID_CSV),
        },
      },
    });
    expect(uploadRes.status()).toBe(200);

    const listRes = await request.get(`${prefix}/files/${projectUuid}`);
    const files = await listRes.json();
    expect(files.length).toBe(1);

    const deleteRes = await request.delete(`${prefix}/files/batch`, {
      data: files.map((f: { uuid: string }) => f.uuid),
    });
    expect(deleteRes.status()).toBe(200);
    const body = await deleteRes.json();
    expect(body.deleted.length).toBe(1);

    const listAfter = await request.get(`${prefix}/files/${projectUuid}`);
    expect((await listAfter.json()).length).toBe(0);
  });
});
