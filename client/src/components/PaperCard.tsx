import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import Box from "@mui/material/Box";
import { alpha } from "@mui/material/styles";
import Button from "@mui/material/Button";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { useRef, useState } from "react";
import { JobTaskHumanResult } from "../state/types";
import { PaperDetails } from "./paperList/PaperDetails";
import { PaperRow } from "./paperList/PaperRow";
import { useTypedStoreActions, useTypedStoreState } from "../state/store";
import { toast } from "react-toastify";
import { attachPdfToPaper } from "../services/fileService";
import { PaperReadWithAvgProbability } from "../services/api/client";

const DECISIONS = [
  {
    value: JobTaskHumanResult.EXCLUDE,
    label: "Exclude",
    color: "error",
    icon: <CloseIcon fontSize="small" />,
  },
  {
    value: JobTaskHumanResult.UNSURE,
    label: "Unsure",
    color: "warning",
    icon: <HelpOutlineOutlinedIcon fontSize="small" />,
  },
  {
    value: JobTaskHumanResult.INCLUDE,
    label: "Include",
    color: "success",
    icon: <CheckIcon fontSize="small" />,
  },
] as const;

type PaperCardProps = {
  paper: PaperReadWithAvgProbability;
  isGithubScreening: boolean;
  "data-testid"?: string;
};

/** A paper in the project's list, expandable to its details and the user's decision. */
export const PaperCard: React.FC<PaperCardProps> = ({
  paper,
  isGithubScreening,
  "data-testid": testId,
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
      data-testid={testId}
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
              <Box sx={{ pb: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<UploadFileOutlinedIcon />}
                  disabled={uploadingPdf}
                  onClick={() => pdfInputRef.current?.click()}
                >
                  {uploadingPdf
                    ? "Uploading…"
                    : paper.pdf_file_uuid
                      ? "Replace full text"
                      : "Upload full text"}
                </Button>
              </Box>
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
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          aria-label="Your decision"
          disabled={isPending}
          value={paper.human_result ?? null}
          onChange={(_, humanResult: JobTaskHumanResult | null) => {
            // Clicking the current decision again keeps it.
            if (humanResult !== null) {
              addHumanResult({
                projectUuid: paper.project_uuid,
                paperUuid: paper.uuid,
                humanResult,
              });
            }
          }}
        >
          {DECISIONS.map(({ value, label, color, icon }) => (
            <ToggleButton
              key={value}
              value={value}
              sx={{
                px: 2,
                gap: 1,
                // Always in the decision's colour; dimmed until chosen,
                // filled once it is the paper's decision.
                color: `${color}.main`,
                opacity: 0.6,
                "&:hover": {
                  opacity: 1,
                  bgcolor: (theme) => alpha(theme.palette[color].main, 0.08),
                },
                "&.Mui-selected": {
                  opacity: 1,
                  color: `${color}.contrastText`,
                  bgcolor: `${color}.main`,
                  "&:hover": { bgcolor: `${color}.dark` },
                },
              }}
            >
              {icon}
              {label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>
    </PaperRow>
  );
};
