import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { promptingStrategyLabel, screeningModeLabel } from "../pages/project/jobLabels";
import { JobScreeningMode, PromptingConfig } from "../state/types";

type LlmModelCardProps = {
  modelName: string;
  binary: string | null;
  likertScale: string | null;
  probability: number | null;
  screeningType: PromptingConfig["screening_type"] | null;
  screeningMode: JobScreeningMode | null;
  isGithubScreening: boolean;
};

const likertMap: Record<string, string> = {
  "1": "Strongly disagree",
  "2": "Disagree",
  "3": "Somewhat disagree",
  "4": "Neither agree nor disagree",
  "5": "Somewhat agree",
  "6": "Agree",
  "7": "Strongly agree",
};

/** One model run's decision on the paper, as a compact outlined card. */
export const LlmModelCard: React.FC<LlmModelCardProps> = ({
  modelName,
  binary,
  likertScale,
  probability,
  screeningType,
  screeningMode,
  isGithubScreening,
}) => {
  // "openai/gpt-5.1-mini": the model on the first line, its provider with the setup below.
  const slash = modelName.lastIndexOf("/");
  const provider = slash > 0 ? modelName.slice(0, slash) : null;
  const model = modelName.slice(slash + 1);
  const setup = [
    provider,
    screeningType && promptingStrategyLabel(screeningType).value,
    screeningMode && screeningModeLabel(screeningMode, isGithubScreening).value,
  ]
    .filter(Boolean)
    .join(" · ");
  const percent = probability != null ? Math.round(probability * 100) : null;
  const decisionColor = binary === "Include" ? "success" : binary === "Exclude" ? "error" : null;
  const likert = Number(likertScale ?? 0);
  // Agreement with including the paper: disagreeing steps red, the midpoint amber, agreeing green.
  const likertColor = likert >= 5 ? "success" : likert === 4 ? "warning" : "error";

  return (
    <Card component="li" variant="outlined" aria-label="Model Card" sx={{ p: 1.5, flexShrink: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Tooltip title={modelName} placement="top-start" enterDelay={500}>
          <Typography variant="subtitle2" component="h3" noWrap sx={{ flex: 1, minWidth: 0 }}>
            {model}
          </Typography>
        </Tooltip>
        <Chip
          size="small"
          label={binary ?? "No result"}
          color={decisionColor ?? "default"}
          variant={binary ? "filled" : "outlined"}
          sx={{ height: 22, fontWeight: 500 }}
        />
      </Box>
      {setup && (
        <Typography
          variant="caption"
          component="p"
          noWrap
          title={setup}
          sx={{ color: "text.secondary" }}
        >
          {setup}
        </Typography>
      )}

      <Box sx={{ mt: 1.5 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            typography: "caption",
            color: "text.secondary",
          }}
        >
          <span>Probability (include)</span>
          <Box component="span" sx={{ color: "text.primary", fontWeight: 500 }}>
            {percent != null ? `${percent} %` : "—"}
          </Box>
        </Box>
        <LinearProgress
          variant="determinate"
          value={percent ?? 0}
          color={decisionColor ?? "inherit"}
          aria-label="Probability (include)"
          sx={{
            mt: 0.5,
            height: 6,
            borderRadius: 3,
            color: "text.disabled",
            // A neutral track, so a low probability doesn't read as a full pale bar.
            bgcolor: "action.disabledBackground",
            "&::before": { display: "none" },
          }}
        />
      </Box>

      <Box sx={{ mt: 1.25 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            typography: "caption",
            color: "text.secondary",
          }}
        >
          <span>Likert (include)</span>
          <Box component="span" sx={{ color: "text.primary", fontWeight: 500 }}>
            {likert ? `${likert}/7` : "—"}
          </Box>
        </Box>
        {likert > 0 && (
          <>
            <Box
              role="meter"
              aria-label="Likert (include)"
              aria-valuemin={1}
              aria-valuemax={7}
              aria-valuenow={likert}
              aria-valuetext={likertMap[likertScale!]}
              sx={{ display: "flex", gap: "3px", mt: 0.5 }}
            >
              {Array.from({ length: 7 }, (_, step) => (
                <Box
                  key={step}
                  sx={{
                    flex: 1,
                    height: 6,
                    borderRadius: 0.5,
                    bgcolor: step < likert ? `${likertColor}.main` : "action.disabledBackground",
                  }}
                />
              ))}
            </Box>
            <Typography variant="caption" component="p" sx={{ color: "text.secondary", mt: 0.25 }}>
              {likertMap[likertScale!]}
            </Typography>
          </>
        )}
      </Box>
    </Card>
  );
};
