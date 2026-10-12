import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TextSnippetOutlinedIcon from "@mui/icons-material/TextSnippetOutlined";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Collapse from "@mui/material/Collapse";
import LinearProgress from "@mui/material/LinearProgress";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { PAPER_LIST_COLUMNS, PAPER_LIST_GUTTER } from "./columns";

/** What the probability column shows when there is no probability to show. */
export type PaperRowStatus = {
  label: string;
  /** Shown instead of `label` on phones, where the column is narrow. */
  shortLabel?: string;
  /** "error" for a failed screening; otherwise the label is greyed out. */
  tone?: "muted" | "error";
  tooltip?: string;
};

type PaperRowProps = {
  paperId: number | null | undefined;
  title: string;
  hasFullText: boolean;
  /** The probability of inclusion, shown as a percentage. */
  probability?: number | null;
  /** Shown instead of the probability when there is none, e.g. "Not screened". */
  status?: PaperRowStatus;
  /** Shown after the title, e.g. the user's decision. */
  badge?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  /** Shown below the row while it is open. */
  children?: React.ReactNode;
  "data-testid"?: string;
};

const Probability: React.FC<{ probability: number }> = ({ probability }) => {
  const percent = Math.round(probability * 100);
  return (
    <Box sx={{ width: "100%", maxWidth: 96, ml: "auto" }}>
      <Typography
        variant="body2"
        sx={{ textAlign: "right", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}
      >
        {percent} %
      </Typography>
      <LinearProgress
        variant="determinate"
        value={percent}
        aria-hidden
        sx={{
          display: { xs: "none", md: "block" },
          mt: 0.5,
          height: 4,
          borderRadius: 2,
          bgcolor: "action.disabledBackground",
        }}
      />
    </Box>
  );
};

const Status: React.FC<PaperRowStatus> = ({ label, shortLabel, tone = "muted", tooltip }) => {
  const text = (
    <Typography
      variant="body2"
      sx={{
        textAlign: "right",
        color: tone === "error" ? "error.main" : "text.disabled",
        fontWeight: tone === "error" ? 500 : undefined,
      }}
    >
      {shortLabel ? (
        <>
          <Box component="span" sx={{ display: { xs: "none", md: "inline" } }}>
            {label}
          </Box>
          <Box component="span" sx={{ display: { md: "none" } }} aria-label={label}>
            {shortLabel}
          </Box>
        </>
      ) : (
        label
      )}
    </Typography>
  );
  return tooltip ? (
    <Tooltip title={tooltip} placement="left">
      {text}
    </Tooltip>
  ) : (
    text
  );
};

/** One row of a paper list, expandable to show more about the paper. */
export const PaperRow: React.FC<PaperRowProps> = ({
  paperId,
  title,
  hasFullText,
  probability,
  status,
  badge,
  open,
  onToggle,
  children,
  "data-testid": testId,
}) => (
  <Box
    data-testid={testId}
    sx={{
      borderBottom: 1,
      borderColor: "divider",
      bgcolor: (theme) => (open ? alpha(theme.palette.primary.main, 0.03) : "transparent"),
    }}
  >
    <ButtonBase
      onClick={onToggle}
      aria-expanded={open}
      sx={{
        width: "100%",
        display: "grid",
        gridTemplateColumns: PAPER_LIST_COLUMNS,
        columnGap: { xs: 1, md: 2 },
        alignItems: "center",
        textAlign: "left",
        px: PAPER_LIST_GUTTER,
        minHeight: 52,
        py: 1,
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      <Typography
        variant="body2"
        sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}
      >
        {paperId}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
        {hasFullText && (
          <Tooltip title="Full text attached">
            <TextSnippetOutlinedIcon
              aria-label="Full text attached"
              sx={{ fontSize: 18, color: "success.main", flexShrink: 0 }}
            />
          </Tooltip>
        )}
        <Typography
          variant="body2"
          title={title}
          sx={{
            fontWeight: 500,
            minWidth: 0,
            // Two lines on phones, where a single line fits only a few words.
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: { xs: 2, md: 1 },
            overflow: "hidden",
            wordBreak: "break-word",
          }}
        >
          {title}
        </Typography>
        {badge && <Box sx={{ flexShrink: 0, display: "flex" }}>{badge}</Box>}
      </Box>
      <Box component="div">
        {probability != null ? (
          <Probability probability={probability} />
        ) : (
          status && <Status {...status} />
        )}
      </Box>
      <ExpandMoreIcon
        sx={{
          justifySelf: "end",
          color: "action.active",
          transition: "transform 150ms",
          transform: open ? "rotate(180deg)" : "none",
        }}
      />
    </ButtonBase>
    <Collapse in={open} unmountOnExit>
      <Box sx={{ px: PAPER_LIST_GUTTER, pt: 1, pb: 3, pl: { md: 13 } }}>{children}</Box>
    </Collapse>
  </Box>
);
