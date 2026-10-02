import { useCallback, useRef, useState } from "react";
import { toast } from "react-toastify";
import { importFulltextFromEndnoteXml } from "../../services/fileService";

/**
 * Importing full texts from a Zotero export folder (an EndNote XML file plus
 * PDFs). Render a hidden file input with `inputProps`, and call `trigger` to
 * open the folder picker.
 */
export const useFulltextImport = (projectUuid: string, onImported: () => Promise<void>) => {
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);

  const ref = useCallback((node: HTMLInputElement | null) => {
    folderInputRef.current = node;
    if (node) {
      node.setAttribute("webkitdirectory", "true");
    }
  }, []);

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!projectUuid) return;

    const fileArray = Array.from(files);
    const xmlFile = fileArray.find((f) => f.name.toLowerCase().endsWith(".xml"));
    const pdfFiles = fileArray.filter((f) => f.name.toLowerCase().endsWith(".pdf"));
    const pdfRelativePaths = pdfFiles.map((f) => f.webkitRelativePath);

    if (!xmlFile) {
      toast.error("No XML file found in the selected folder");
      e.target.value = "";
      return;
    }

    setImporting(true);
    try {
      const result = await importFulltextFromEndnoteXml(
        projectUuid,
        xmlFile,
        pdfFiles,
        pdfRelativePaths,
      );
      toast.success(
        `Matched ${result.matched_count} full text${result.matched_count === 1 ? "" : "s"}` +
          (result.unmatched.length > 0 ? `, ${result.unmatched.length} unmatched` : ""),
      );
      if (result.unmatched.length > 0) {
        console.warn("Unmatched files:", result.unmatched);
      }
      await onImported();
    } catch (error) {
      console.error("Failed to import full text:", error);
      toast.error("Failed to import full text");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const trigger = useCallback(() => {
    folderInputRef.current?.click();
  }, []);

  return { importing, trigger, inputProps: { ref, onChange } };
};
