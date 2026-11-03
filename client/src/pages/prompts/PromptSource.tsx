import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
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

/** The publication of a built-in prompt and its citation. */
export const PromptSourceNotice: React.FC<PromptSourceNoticeProps> = ({ source, version }) => (
  <Alert
    severity="info"
    variant="outlined"
    icon={<MenuBookOutlinedIcon />}
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
