import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { TokenEstimation } from "../../../state/types";

const fmt = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const Row: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
    <Typography variant="caption" color="textSecondary">
      {label}
    </Typography>
    <Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
      ~{fmt.format(value)}
    </Typography>
  </Box>
);

export const TokenEstimate: React.FC<{ estimation: TokenEstimation }> = ({ estimation }) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
      <Typography variant="caption" sx={{ fontWeight: 600 }}>
        Estimated usage
      </Typography>
      <Tooltip title="Values are approximate estimates.">
        <InfoOutlinedIcon sx={{ fontSize: 14, color: "text.disabled", cursor: "help" }} />
      </Tooltip>
    </Box>
    <Row label="Input tokens" value={estimation.estimated_input_tokens} />
    {estimation.estimated_output_tokens !== null && (
      <Row label="Output tokens" value={estimation.estimated_output_tokens} />
    )}
  </Box>
);
