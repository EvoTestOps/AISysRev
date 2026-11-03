import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { toast } from "react-toastify";
import type { PromptSource } from "../../state/types/prompt";

/** Marks a built-in prompt that comes from a publication, e.g. "Published · ESEM '25". */
export const PromptSourceChip: React.FC<{ source: PromptSource }> = ({ source }) => (
  <Tooltip title={source.citation}>
    <Chip
      size="small"
      color="primary"
      variant="outlined"
      icon={<MenuBookOutlinedIcon />}
      label={`Published · ${source.label}`}
      data-testid="prompt-source-chip"
    />
  </Tooltip>
);

type PromptSourceNoticeProps = {
  source: PromptSource;
  /** The version shown in the editor. */
  version: number;
};

/** The publication of a built-in prompt, with its citation to copy. */
export const PromptSourceNotice: React.FC<PromptSourceNoticeProps> = ({ source, version }) => {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(source.citation);
      toast.success("Citation copied.");
    } catch {
      toast.error("Could not copy the citation.");
    }
  };

  return (
    <Alert
      severity="info"
      variant="outlined"
      icon={<MenuBookOutlinedIcon />}
      action={
        <Button size="small" startIcon={<ContentCopyOutlinedIcon />} onClick={copy}>
          Cite
        </Button>
      }
      data-testid="prompt-source-notice"
    >
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {version === source.version
          ? `This is the prompt published in ${source.label}.`
          : `Version ${source.version} of this prompt is the one published in ${source.label}; this version differs from it.`}
      </Typography>
      <Typography variant="body2">
        {source.citation}{" "}
        <Link href={`https://doi.org/${source.doi}`} target="_blank" rel="noopener noreferrer">
          doi:{source.doi}
        </Link>
      </Typography>
    </Alert>
  );
};
