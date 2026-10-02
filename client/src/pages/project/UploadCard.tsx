import Skeleton from "react-loading-skeleton";
import { Card } from "../../components/Card";
import { FileDropArea } from "../../components/FileDropArea";
import { TruncatedFileNames } from "../../components/TruncatedFileNames";
import { FetchedFile } from "../../state/types";

type UploadCardProps = {
  files: FetchedFile[];
  loading: boolean;
  itemNamePlural: string;
  onFilesSelected: (files: File[]) => void;
};

export const UploadCard: React.FC<UploadCardProps> = ({
  files,
  loading,
  itemNamePlural,
  onFilesSelected,
}) => {
  const csvFiles = files.filter((f) => f.mime_type !== "application/pdf");
  const pdfFileCount = files.length - csvFiles.length;

  return (
    <Card>
      {files.length === 0 && (
        <div>
          <FileDropArea onFilesSelected={onFilesSelected} />
        </div>
      )}
      {loading ? (
        <Skeleton />
      ) : (
        <>
          <TruncatedFileNames files={csvFiles} maxLength={25} itemNamePlural={itemNamePlural} />
          {pdfFileCount > 0 && (
            <p className="text-sm font-medium">
              {pdfFileCount} {pdfFileCount === 1 ? "PDF" : "PDFs"}
            </p>
          )}
        </>
      )}
    </Card>
  );
};
