import { api } from "../services/api";
import { ScreeningTarget } from "../state/types";

export const fileFetchFromBackend = async (projectUuid: string) => {
  try {
    const res = await api.get("/api/v1/files/{project_uuid}", {
      path: {
        project_uuid: projectUuid
      }
    })
    return res;
  } catch (error) {
    console.error("File fetch error: ", error);
    throw error;
  }
};

export const fileUploadToBackend = async (
  files: File[],
  projectUuid: string,
  screeningTarget = ScreeningTarget.PAPER,
) => {
  try {
    // The spec types binary fields as strings, so pass Files through and skip input validation
    const res = await api.post("/api/v1/files/upload", {
      body: {
        project_uuid: projectUuid,
        screening_target: screeningTarget,
        files: files as unknown as string[],
      },
      validate: "output",
    });
    return res
  } catch (error) {
    console.error("Backend upload error", error);
    throw error;
  }
};

export const attachPdfToPaper = async (
  paperUuid: string,
  file: File,
) => {
  try {
    // The spec types binary fields as strings, so pass the File through and skip input validation
    return await api.post("/api/v1/files/{paper_uuid}/attach-pdf", {
      path: { paper_uuid: paperUuid },
      body: { file: file as unknown as string },
      validate: "output",
    });
  } catch (error) {
    console.error("Backend attach PDF error", error);
    throw error;
  }
};

export const importFulltextFromEndnoteXml = async (
  projectUuid: string,
  xmlFile: File,
  pdfFiles: File[],
  pdfRelativePaths: string[],
) => {
  try {
    // The spec types binary fields as strings, so pass Files through and skip input validation
    return await api.post("/api/v1/files/import-fulltext", {
      body: {
        project_uuid: projectUuid,
        xml_file: xmlFile as unknown as string,
        pdf_files: pdfFiles as unknown as string[],
        pdf_relative_paths: pdfRelativePaths,
      },
      validate: "output",
    });
  } catch (error) {
    console.error("Backend import fulltext error", error);
    throw error;
  }
};
