import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import TuneIcon from "@mui/icons-material/Tune";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { useState } from "react";
import { JobPromptingType, JobScreeningMode } from "../../../state/types";
import type { Project } from "../../../state/types/project";
import { CreateTaskForm } from "../hooks/useCreateTaskForm";
import { evaluationModeLabel, promptingStrategyLabel, screeningModeLabel } from "../jobLabels";
import { JevScreeningFields } from "./jev/JevScreeningFields";
import { EvaluationModeSelector } from "./llm/EvaluationModeSelector";
import { PerCriteriaLogic } from "./llm/PerCriteriaLogic";
import { PromptingStrategySelector } from "./llm/PromptingStrategySelector";
import { ScreeningModeSelector } from "./llm/ScreeningModeSelector";
import { ModelPicker } from "./ModelPicker";
import { ProviderSettings } from "./ProviderSettings";
import { ScreeningMethodSelector } from "./ScreeningMethodSelector";
import { TokenEstimate } from "./TokenEstimate";
import { estimateTokens } from "./tokenEstimation";

const Section: React.FC<
  React.PropsWithChildren<{ step: number; title: string; tooltip?: string }>
> = ({ step, title, tooltip, children }) => (
  <Box component="section" sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
      <Box
        aria-hidden
        sx={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          typography: "caption",
          fontWeight: 700,
          color: "primary.main",
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
        }}
      >
        {step}
      </Box>
      <Tooltip title={tooltip ?? ""} placement="top-start">
        <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
      </Tooltip>
    </Box>
    {children}
  </Box>
);

/** What the model reads, as the summary sentence puts it. */
const readsWhat = (mode: JobScreeningMode, isGithub: boolean) => {
  if (isGithub) return "the names, descriptions and READMEs of";
  switch (mode) {
    case JobScreeningMode.PDF:
      return "the full text (PDF) of";
    case JobScreeningMode.AUTOMATIC:
      return "the full text (or abstract, when there's no PDF) of";
    default:
      return "the titles and abstracts of";
  }
};

type TaskSetupFormProps = {
  form: CreateTaskForm;
  project: Project;
  paperCount: number;
  itemName: string;
  itemNamePlural: string;
  isGithubScreening: boolean;
  /** Called once a task was created (or the few-shot modal opened). */
  onCreated?: () => void;
};

/**
 * Choosing how to screen: method, provider and model up front, the rarely
 * changed options folded away, and a live summary with the start button.
 */
export const TaskSetupForm: React.FC<TaskSetupFormProps> = ({
  form,
  project,
  paperCount,
  itemName,
  itemNamePlural,
  isGithubScreening,
  onCreated,
}) => {
  const [customizing, setCustomizing] = useState(false);
  const [creating, setCreating] = useState(false);
  const { inclusion_criteria, exclusion_criteria } = project.criteria;
  const criteriaCount = inclusion_criteria.length + exclusion_criteria.length;
  const isPerCriterion = form.promptingStrategy === JobPromptingType.PER_CRITERIA;
  const isFewShot = form.promptingStrategy === JobPromptingType.FEW_SHOT;
  const hasMethodChoice = Boolean(form.jevProvider);
  // Only secrets (API keys) are required to be set; non-secret parameters such
  // as toggles fall back to their default.
  const requiredSettings = (form.configParameters ?? []).filter((param) => param.secret);

  const tokenEstimation = estimateTokens({
    paperCount,
    criteriaCount,
    screeningMethod: form.screeningMethod,
    promptingStrategy: form.promptingStrategy,
  });

  const optionChips = form.isJevScreening
    ? ["Title+Abstract", "All criteria at once", "Zero-shot"]
    : [
        ...(isGithubScreening ? [] : [screeningModeLabel(form.screeningMode, false).value]),
        evaluationModeLabel(form.promptingStrategy).value,
        promptingStrategyLabel(form.promptingStrategy).value,
      ];

  const missing = !form.isProviderSelected
    ? "Choose a provider to continue."
    : !form.modelsLoaded
      ? "Loading the provider's models…"
      : !form.isModelSelected
        ? "Choose a model to continue."
        : null;

  const start = async () => {
    setCreating(true);
    try {
      if (await form.createTask()) onCreated?.();
    } finally {
      setCreating(false);
    }
  };

  const modelName = form.selectedModel?.value;
  const step = (n: number) => (hasMethodChoice ? n : n - 1);

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 320px" },
        gap: { xs: 3, md: 4 },
        alignItems: "start",
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3.5, minWidth: 0 }}>
        {hasMethodChoice && (
          <Section
            step={1}
            title="Screening method"
            tooltip="LLM screening asks a language model to judge each criterion and explain why. Jev screening asks TypeSafe's Jev decision model for a calibrated probability per criterion."
          >
            <ScreeningMethodSelector form={form} />
          </Section>
        )}

        <Section step={step(2)} title="Model">
          {form.isJevScreening ? (
            <JevScreeningFields
              form={form}
              itemName={itemName}
              isGithubScreening={isGithubScreening}
            />
          ) : (
            <>
              <TextField
                select
                label="Provider"
                fullWidth
                value={form.selectedProvider?.value ?? ""}
                onChange={(e) => {
                  const provider = form.llmProviders.find((p) => p.name === e.target.value);
                  if (!provider) return;
                  form.selectProvider({ name: provider.title, value: provider.name });
                  form.setIsProviderSelected(true);
                }}
                slotProps={{
                  select: { SelectDisplayProps: { "data-testid": "llm-provider-dropdown" } as object },
                }}
              >
                {form.llmProviders.map((provider) => (
                  <MenuItem
                    key={provider.name}
                    value={provider.name}
                    data-testid={`llm-provider-dropdown-option-${provider.name}`}
                  >
                    {provider.title}
                  </MenuItem>
                ))}
              </TextField>
              <ProviderSettings form={form} requiredSettings={requiredSettings} />
              <ModelPicker form={form} />
            </>
          )}
        </Section>

        <Section step={step(3)} title="Options">
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
            {optionChips.map((label) => (
              <Chip key={label} label={label} variant="outlined" sx={{ bgcolor: "background.paper" }} />
            ))}
            {!form.isJevScreening && (
              <Button
                size="small"
                startIcon={customizing ? <ExpandLessIcon /> : <TuneIcon />}
                onClick={() => setCustomizing((open) => !open)}
                aria-expanded={customizing}
                data-testid="customize-task-options"
              >
                {customizing ? "Done" : "Customize"}
              </Button>
            )}
          </Box>
          {!form.isJevScreening && (
            <Collapse in={customizing} unmountOnExit>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1 }}>
                {!isGithubScreening && <ScreeningModeSelector form={form} disabled={false} />}
                <EvaluationModeSelector form={form} disabled={false} />
                {isPerCriterion ? (
                  <PerCriteriaLogic
                    inclusionExpression={project.criteria.inclusion_expression}
                    exclusionExpression={project.criteria.exclusion_expression}
                  />
                ) : (
                  <PromptingStrategySelector form={form} disabled={false} />
                )}
              </Box>
            </Collapse>
          )}
        </Section>
      </Box>

      <Box
        component="aside"
        aria-label="Summary"
        sx={{
          // Always in reach: beside the form on wide screens, pinned to the
          // bottom on narrow ones, where the form is long.
          position: "sticky",
          top: { md: 24 },
          bottom: { xs: 0, md: "auto" },
          zIndex: 1,
          p: 2.5,
          borderRadius: 3,
          bgcolor: "background.paper",
          backgroundImage: (theme) =>
            `linear-gradient(${alpha(theme.palette.primary.main, 0.05)}, ${alpha(theme.palette.primary.main, 0.05)})`,
          border: 1,
          borderColor: (theme) => alpha(theme.palette.primary.main, 0.15),
          boxShadow: { xs: 8, md: 0 },
          display: "flex",
          flexDirection: "column",
          gap: { xs: 1.5, md: 2 },
        }}
      >
        <Typography
          variant="overline"
          color="textSecondary"
          sx={{ lineHeight: 1, display: { xs: "none", md: "block" } }}
        >
          Summary
        </Typography>
        <Typography variant="body2" sx={{ "& strong": { fontWeight: 600 } }}>
          <strong>{modelName ?? (form.isJevScreening ? "Jev" : "The model")}</strong> will read{" "}
          {readsWhat(form.screeningMode, isGithubScreening)}{" "}
          <strong>
            {paperCount} {paperCount === 1 ? itemName : itemNamePlural}
          </strong>{" "}
          and check <strong>{criteriaCount} criteria</strong>
          {isPerCriterion ? ", one call per criterion" : ""}
          {isFewShot ? `, with examples you pick next` : ""}.
        </Typography>
        <Box sx={{ display: { xs: "none", md: "block" } }}>
          <TokenEstimate estimation={tokenEstimation} />
        </Box>
        <Box>
          <Button
            variant="contained"
            size="large"
            fullWidth
            disabled={missing !== null || creating}
            onClick={start}
            startIcon={isFewShot ? undefined : <PlayArrowRoundedIcon />}
            endIcon={isFewShot ? <ArrowForwardRoundedIcon /> : undefined}
            data-testid="create-task-button"
            sx={{ py: 1.25, borderRadius: 2 }}
          >
            {isFewShot ? "Choose examples" : "Start screening"}
          </Button>
          <Typography
            variant="caption"
            color="textSecondary"
            sx={{ display: "block", textAlign: "center", mt: 1, minHeight: "1.5em" }}
          >
            {missing ?? "Runs in the background. You can leave this page."}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
