import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TextSnippetOutlinedIcon from "@mui/icons-material/TextSnippetOutlined";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Card from "@mui/material/Card";
import Collapse from "@mui/material/Collapse";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { PAPER_LIST_COLUMNS } from "./columns";

type PaperRowProps = {
  paperId: number | null | undefined;
  title: string;
  hasFullText: boolean;
  /** The probability column: a value, or a status such as "Pending". */
  value: React.ReactNode;
  /** Greys out `value`, e.g. while there is no result yet. */
  valueMuted?: boolean;
  open: boolean;
  onToggle: () => void;
  /** Shown below the row while it is open. */
  children?: React.ReactNode;
  "data-testid"?: string;
};

/** One row of a list of papers, expandable to show more about the paper. */
export const PaperRow: React.FC<PaperRowProps> = ({
  paperId,
  title,
  hasFullText,
  value,
  valueMuted = false,
  open,
  onToggle,
  children,
  "data-testid": testId,
}) => (
  <Card data-testid={testId} sx={{ borderRadius: 2 }}>
    <ButtonBase
      onClick={onToggle}
      aria-expanded={open}
      sx={{
        width: "100%",
        display: "grid",
        gridTemplateColumns: PAPER_LIST_COLUMNS,
        alignItems: "center",
        textAlign: "left",
        px: 2,
        py: 1.75,
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {paperId}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
        {hasFullText && (
          <Tooltip title="Full text attached">
            <TextSnippetOutlinedIcon
              aria-label="Full text attached"
              sx={{ fontSize: 16, color: "success.main", flexShrink: 0 }}
            />
          </Tooltip>
        )}
        <Typography variant="body2" noWrap title={title} sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
      </Box>
      <Typography
        variant="body2"
        component="div"
        sx={{ textAlign: "center", color: valueMuted ? "text.disabled" : undefined }}
      >
        {value}
      </Typography>
      <ExpandMoreIcon
        sx={{
          justifySelf: "end",
          color: "text.secondary",
          transition: "transform 150ms",
          transform: open ? "rotate(180deg)" : "none",
        }}
      />
    </ButtonBase>
    <Collapse in={open} unmountOnExit>
      <Box sx={{ px: 2, pb: 2 }}>{children}</Box>
    </Collapse>
  </Card>
);
