import classNames from "classnames";
import {
  ChevronDown,
  ChevronUp,
  X,
  CircleQuestionMark,
  Check,
  FileText,
} from "lucide-react";
import { useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { JobTaskHumanResult, PaperWithModelEval } from "../state/types";
import { Card, CardProps } from "./Card";
import { Button } from "./Button";
import { useTypedStoreActions, useTypedStoreState } from "../state/store";
import { toast } from "react-toastify";
import { attachPdfToPaper } from "../services/fileService";

type PaperCardProps = {
  paper: PaperWithModelEval;
  isGithubScreening: boolean;
};

export const PaperCard: React.FC<
  React.PropsWithChildren<CardProps> & PaperCardProps
> = ({ paper, isGithubScreening, ...rest }) => {
  const [open, setOpen] = useState(false);

  const getPaperPendingState = useTypedStoreState(
    (actions) => actions.getPaperPendingState
  );
  const isPending = getPaperPendingState(paper.uuid);
  const addHumanResult = useTypedStoreActions(
    (actions) => actions.addHumanResult
  );
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
        pdfFileUuid: updatedPaper.pdf_file_uuid,
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
    <Card {...rest} padding="p-0">
      <button
        className={twMerge(
          classNames(
            "rounded-lg p-4 grid grid-cols-[60px_1fr_240px_30px] items-center content-center hover:cursor-pointer hover:bg-gray-50"
          )
        )}
        onClick={() => {
          setOpen(!open);
        }}
      >
        <div className="text-sm font-semibold select-none text-left">
          {paper.paper_id}
        </div>
        <div
          className="text-sm font-semibold select-none text-left flex items-center gap-1.5"
          title={paper.title}
        >
          {paper.pdf_file_uuid && (
            <FileText
              size={14}
              className="text-teal-600 shrink-0"
              aria-label="Full text attached"
            />
          )}
          <span className="truncate">
            {paper.title.length > 80
              ? paper.title.substring(0, 77) + "..."
              : paper.title}
          </span>
        </div>
        <div
          className={classNames("text-center text-sm select-none", {
            "text-gray-400": paper.avg_probability_decision == null,
          })}
        >
          {paper.avg_probability_decision != null
            ? paper.avg_probability_decision.toFixed(3)
            : hasErrors
              ? "ERROR"
              : "Pending"}
        </div>
        <div>
          {!open && (
            <ChevronDown
              className="hover:cursor-pointer"
              onClick={() => {
                setOpen(true);
              }}
            />
          )}
          {open && (
            <ChevronUp
              className="hover:cursor-pointer"
              onClick={() => {
                setOpen(false);
              }}
            />
          )}
        </div>
      </button>
      {open && (
        <div className="pl-4 pr-4 pb-4">
          <div className="text-sm pt-2 pb-2">
            {paper.doi && (
              <>
                <strong>{isGithubScreening ? "Repository URL" : "DOI"}:</strong>{" "}
                <a
                  href={isGithubScreening ? (/^https?:\/\//i.test(paper.doi) ? paper.doi : undefined) : `https://doi.org/${paper.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-blue-600 hover:text-blue-800"
                >
                  {paper.doi}
                </a>
              </>
            )}
          </div>
          {paper.pdf_file_uuid && paper.pdf_filename && (
            <div className="text-sm pt-2 pb-2">
              <strong>Full text:</strong>{" "}
              <a
                href={`/api/v1/files/${paper.pdf_file_uuid}/download`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-blue-600 hover:text-blue-800"
              >
                {paper.pdf_filename}
              </a>
            </div>
          )}
          {!isGithubScreening && (
          <div className="flex items-center gap-2 pb-2">
            <Button
              variant="slate"
              size="xs"
              disabled={uploadingPdf}
              onClick={() => pdfInputRef.current?.click()}
            >
              {uploadingPdf ? "Uploading..." : paper.pdf_file_uuid ? "Replace full text" : "Upload full text"}
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
          <div className="text-xs mb-4 bg-slate-200 rounded-md font-mono p-2">
            {paper.abstract}
          </div>
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
        </div>
      )}
    </Card>
  );
};
