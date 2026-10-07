import { ScreeningTarget } from "../../state/types";

const saveBlob = (blob: Blob, filename: string) => {
  const objectUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(objectUrl);
};

const downloadFile = async (url: string, filename: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    return;
  }
  saveBlob(await response.blob(), filename);
};

export const downloadResultCsv = (projectUuid: string, screeningTarget: ScreeningTarget) =>
  downloadFile(
    `/api/v1/result/download_result_csv?${new URLSearchParams({
      project_uuid: projectUuid,
      screening_target: screeningTarget,
    }).toString()}`,
    `project_${projectUuid}_results.csv`,
  ).catch(console.error);

export const downloadMissingFulltextRis = (projectUuid: string) =>
  downloadFile(
    `/api/v1/paper/${projectUuid}/missing_fulltext_ris`,
    `project_${projectUuid}_missing_fulltext.ris`,
  ).catch(console.error);

/** The columns an uploaded CSV must have, the same as the server checks. */
export const REQUIRED_CSV_COLUMNS: Record<ScreeningTarget, string[]> = {
  [ScreeningTarget.PAPER]: ["title", "abstract", "doi"],
  [ScreeningTarget.GITHUB_REPOSITORY]: ["repository_name", "description", "html_url", "readme"],
};

const TEMPLATE_EXAMPLE_ROW: Record<ScreeningTarget, string[]> = {
  [ScreeningTarget.PAPER]: [
    "An example paper title",
    "The abstract of the paper.",
    "10.1234/example.5678",
  ],
  [ScreeningTarget.GITHUB_REPOSITORY]: [
    "octo/example",
    "A one-line description of the repository.",
    "https://github.com/octo/example",
    "The README of the repository.",
  ],
};

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

/** A CSV with the required columns and one example row, made in the browser. */
export const downloadCsvTemplate = (screeningTarget: ScreeningTarget) => {
  const rows = [REQUIRED_CSV_COLUMNS[screeningTarget], TEMPLATE_EXAMPLE_ROW[screeningTarget]];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
  saveBlob(
    new Blob([csv], { type: "text/csv" }),
    screeningTarget === ScreeningTarget.GITHUB_REPOSITORY
      ? "repositories_template.csv"
      : "papers_template.csv",
  );
};
