import { X, CircleQuestionMark, Check } from "lucide-react";
import { useRef, useState } from "react";
import { JobTaskHumanResult } from "../state/types";
import { CardProps } from "./Card";
import { PaperDetails } from "./paperList/PaperDetails";
import { PaperRow } from "./paperList/PaperRow";
import { Button } from "./Button";
import { useTypedStoreActions, useTypedStoreState } from "../state/store";
import { toast } from "react-toastify";
import { attachPdfToPaper } from "../services/fileService";
import { PaperReadWithAvgProbability } from "../services/api/client";

type PaperCardProps = {
  paper: PaperReadWithAvgProbability;
  isGithubScreening: boolean;
};

export const PaperCard: React.FC<React.PropsWithChildren<CardProps> & PaperCardProps> = ({
  paper,
  isGithubScreening,
  ...rest
}) => {
  const [open, setOpen] = useState(false);

  const getPaperPendingState = useTypedStoreState((actions) => actions.getPaperPendingState);
  const isPending = getPaperPendingState(paper.uuid);
  const addHumanResult = useTypedStoreActions((actions) => actions.addHumanResult);
  const setPaperPdf = useTypedStoreActions((actions) => actions.setPaperPdf);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const handlePdfSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPdf(true);
    try {
      const updatedPaper = await attachPdfToPaper(paper.uuid, file);
      setPaperPdf({
        projectUuid: paper.project_uuid,
        paperUuid: paper.uuid,
        pdfFileUuid: updatedPaper.pdf_file_uuid as string,
        pdfFilename: file.name,
      });
      toast.success("Full text uploaded");
    } catch (error) {
      console.error("Failed to attach PDF:", error);
      toast.error("Failed to upload full text");
    } finally {
      setUploadingPdf(false);
      e.target.value = "";
    }
  };
  const hasErrors = (paper.error_messages?.length ?? 0) > 0;

  return (
    <PaperRow
      {...rest}
      paperId={paper.paper_id}
      title={paper.title}
      hasFullText={Boolean(paper.pdf_file_uuid)}
      value={
        paper.avg_probability_decision != null
          ? paper.avg_probability_decision.toFixed(3)
          : hasErrors
            ? "ERROR"
            : "Pending"
      }
      valueMuted={paper.avg_probability_decision == null}
      open={open}
      onToggle={() => setOpen(!open)}
    >
      <PaperDetails
        doi={paper.doi}
        abstract={paper.abstract}
        pdfFileUuid={paper.pdf_file_uuid}
        pdfFilename={paper.pdf_filename}
        isGithubScreening={isGithubScreening}
        actions={
          <>
            {!isGithubScreening && (
              <div className="flex items-center gap-2 pb-2">
                <Button
                  variant="slate"
                  size="xs"
                  disabled={uploadingPdf}
                  onClick={() => pdfInputRef.current?.click()}
                >
                  {uploadingPdf
                    ? "Uploading..."
                    : paper.pdf_file_uuid
                      ? "Replace full text"
                      : "Upload full text"}
                </Button>
              </div>
            )}
            <input
              type="file"
              accept=".pdf"
              ref={pdfInputRef}
              onChange={handlePdfSelected}
              className="hidden"
            />
          </>
        }
      />
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          variant="red"
          size="xs"
          disabled={isPending}
          invert={paper.human_result !== JobTaskHumanResult.EXCLUDE}
          onClick={() => {
            addHumanResult({
              projectUuid: paper.project_uuid,
              paperUuid: paper.uuid,
              humanResult: JobTaskHumanResult.EXCLUDE,
            });
          }}
        >
          <div className="flex flex-row gap-2 items-center font-semibold">
            <X size={15} />
            <span className="select-none">Exclude</span>
          </div>
        </Button>
        <Button
          variant="yellow"
          size="xs"
          disabled={isPending}
          invert={paper.human_result !== JobTaskHumanResult.UNSURE}
          onClick={() => {
            addHumanResult({
              projectUuid: paper.project_uuid,
              paperUuid: paper.uuid,
              humanResult: JobTaskHumanResult.UNSURE,
            });
          }}
        >
          <div className="flex flex-row gap-2 items-center font-semibold">
            <CircleQuestionMark size={15} />
            <span className="select-none">Unsure</span>
          </div>
        </Button>
        <Button
          variant="green"
          size="xs"
          disabled={isPending}
          invert={paper.human_result !== JobTaskHumanResult.INCLUDE}
          onClick={() => {
            addHumanResult({
              projectUuid: paper.project_uuid,
              paperUuid: paper.uuid,
              humanResult: JobTaskHumanResult.INCLUDE,
            });
          }}
        >
          <div className="flex flex-row gap-2 items-center font-semibold">
            <Check size={15} />
            <span className="select-none">Include</span>
          </div>
        </Button>
      </div>
    </PaperRow>
  );
};
