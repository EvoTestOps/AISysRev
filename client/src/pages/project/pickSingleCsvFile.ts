import { toast } from "react-toastify";

/**
 * The one CSV file among the given files, or null (after telling the user why)
 * when there is none or more than one.
 */
export const pickSingleCsvFile = (files: File[]): File | null => {
  const csvFiles = files.filter(
    (file) => file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv"),
  );
  if (csvFiles.length === 0) {
    toast.error("Only CSV files are allowed.");
    return null;
  }
  if (csvFiles.length > 1) {
    toast.error("Only one CSV file is allowed.");
    return null;
  }
  const skipped = files.length - csvFiles.length;
  if (skipped > 0) {
    toast.error(`${skipped} file(s) were skipped because they are not CSV files.`);
  }
  return csvFiles[0];
};
