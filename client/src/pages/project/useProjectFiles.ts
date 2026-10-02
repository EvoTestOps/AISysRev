import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { ExpandableToast } from "../../components/ExpandableToast";
import { TypedStatusError } from "../../services/api/client";
import { fileFetchFromBackend, fileUploadToBackend } from "../../services/fileService";
import { useTypedStoreActions } from "../../state/store";
import { FetchedFile, ScreeningTarget } from "../../state/types";

/** The project's uploaded files, and uploading more of them. */
export const useProjectFiles = (projectUuid: string, screeningTarget: ScreeningTarget) => {
  const fetchPapers = useTypedStoreActions((actions) => actions.fetchPapers);
  const [files, setFiles] = useState<FetchedFile[]>([]);

  const fetchFiles = useCallback(async () => {
    try {
      setFiles(await fileFetchFromBackend(projectUuid));
    } catch (e) {
      toast.warn("Fetching file(s) failed.");
      console.error("File fetch error:", e);
      throw e;
    }
  }, [projectUuid]);

  useEffect(() => {
    fetchFiles().catch((e) => console.error("Problem fetching the files", e));
  }, [fetchFiles]);

  const uploadFiles = useCallback(
    async (selected: File[]) => {
      try {
        const res = await fileUploadToBackend(selected, projectUuid, screeningTarget);
        if (res.valid_filenames?.length) {
          toast.success(`${res.valid_filenames.length} file(s) uploaded`);
        }
        if ((res.empty_abstract_count ?? 0) > 0) {
          const emptyFieldName =
            screeningTarget === ScreeningTarget.GITHUB_REPOSITORY ? "readme" : "abstract";
          toast.warn(
            `${res.empty_abstract_count} ${emptyFieldName}s are empty - results will not be optimal`,
            { autoClose: 8000 },
          );
        }
        if (res.errors?.length) {
          ExpandableToast(res.errors);
          console.error("File upload errors:", res.errors);
        }
      } catch (e) {
        if (e instanceof TypedStatusError) {
          toast.error("File upload failed: " + (e.response.data as { detail?: unknown }).detail);
        } else {
          toast.error("File upload failed due to unknown error");
        }
        console.error("File upload error:", e);
        throw e;
      }
    },
    [projectUuid, screeningTarget],
  );

  const handleFilesSelected = useCallback(
    async (selected: File[]) => {
      try {
        await uploadFiles(selected);
        await fetchFiles();
        await fetchPapers(projectUuid);
      } catch (error) {
        console.error("Problem uploading the files", error);
      }
    },
    [uploadFiles, fetchFiles, projectUuid, fetchPapers],
  );

  return { files, fetchFiles, handleFilesSelected };
};
