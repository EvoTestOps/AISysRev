import { ScreeningTarget } from "../../state/types";

const downloadFile = async (url: string, filename: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    return;
  }
  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(objectUrl);
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
