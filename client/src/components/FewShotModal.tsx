import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CloseIcon from "@mui/icons-material/Close";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Step from "@mui/material/Step";
import StepButton from "@mui/material/StepButton";
import Stepper from "@mui/material/Stepper";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { useCallback, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useParams } from "wouter";
import { screeningModeLabel } from "../pages/project/jobLabels";
import { PaperReadWithAvgProbability } from "../services/api/client";
import { createJob } from "../services/jobService";
import { useTypedStoreState } from "../state/store";
import {
  createFewShotPromptingConfig,
  JobScreeningMode,
  JobTaskHumanResult,
  LlmConfig,
  ScreeningTarget,
} from "../state/types";

type FewShotModalProps = {
  onClose: () => void;
  screeningTarget: ScreeningTarget;
  /** The task form's provider and model, or null while none is chosen. */
  llmConfig: LlmConfig | null;
  /** The form is still restoring its provider and model, e.g. after a refresh. */
  llmConfigLoading: boolean;
  screeningMode: JobScreeningMode;
};

const STEPS = ["Inclusion examples", "Exclusion examples", "Review"] as const;

/** Lowest probability first; papers no model has scored yet go to the top. */
const byProbability = (a: PaperReadWithAvgProbability, b: PaperReadWithAvgProbability) =>
  (a.avg_probability_decision ?? -1) - (b.avg_probability_decision ?? -1);

const formatScore = (probability: number | null | undefined) =>
  probability != null ? `${Math.round(probability * 100)} %` : "Not screened";

const toggle = (list: string[], uuid: string) =>
  list.includes(uuid) ? list.filter((u) => u !== uuid) : [...list, uuid];

/** Papers the user labelled one way, as a checklist to pick seed examples from. */
const SeedList: React.FC<{
  papers: PaperReadWithAvgProbability[];
  selected: string[];
  onChange: (selected: string[]) => void;
  label: string;
  emptyMessage: string;
  testId: string;
}> = ({ papers, selected, onChange, label, emptyMessage, testId }) => {
  if (papers.length === 0) {
    return (
      <Alert
        severity="info"
        variant="outlined"
        sx={{ borderRadius: 2 }}
        data-testid={`${testId}-empty`}
      >
        {emptyMessage}
      </Alert>
    );
  }
  const allSelected = selected.length === papers.length;
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }} data-testid={testId}>
      <List
        dense
        disablePadding
        sx={{ maxHeight: { xs: "none", sm: "50vh" }, overflowY: "auto" }}
        subheader={
          <ListSubheader
            disableGutters
            sx={{
              display: "flex",
              alignItems: "center",
              pr: 2,
              borderBottom: 1,
              borderColor: "divider",
              lineHeight: "40px",
            }}
          >
            <Checkbox
              edge="start"
              size="small"
              checked={allSelected}
              indeterminate={selected.length > 0 && !allSelected}
              onChange={() => onChange(allSelected ? [] : papers.map((p) => p.uuid))}
              data-testid={`${testId}-select-all`}
              slotProps={{ input: { "aria-label": `Select all ${label}` } }}
              sx={{ ml: 1.5, mr: 1 }}
            />
            <Box component="span" sx={{ flex: 1 }}>
              {selected.length} of {papers.length} selected
            </Box>
            <span>Probability (include)</span>
          </ListSubheader>
        }
      >
        {papers.map((paper) => {
          const checked = selected.includes(paper.uuid);
          return (
            <ListItem key={paper.uuid} disablePadding divider>
              <ListItemButton
                onClick={() => onChange(toggle(selected, paper.uuid))}
                data-testid={`few-shot-seed-${paper.uuid}`}
                selected={checked}
                sx={{ gap: 2 }}
              >
                <ListItemIcon sx={{ minWidth: 0 }}>
                  <Checkbox
                    edge="start"
                    size="small"
                    checked={checked}
                    tabIndex={-1}
                    disableRipple
                    slotProps={{ input: { "aria-labelledby": `seed-${paper.uuid}` } }}
                  />
                </ListItemIcon>
                <ListItemText
                  id={`seed-${paper.uuid}`}
                  primary={paper.title}
                  slotProps={{ primary: { variant: "body2" } }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    flexShrink: 0,
                    textAlign: "right",
                    color:
                      paper.avg_probability_decision != null ? "text.primary" : "text.disabled",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatScore(paper.avg_probability_decision)}
                </Typography>
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Paper>
  );
};

/** The chosen seed papers of one kind, for the review step. */
const SeedSummary: React.FC<{
  title: string;
  papers: PaperReadWithAvgProbability[];
  emptyMessage: string;
}> = ({ title, papers, emptyMessage }) => (
  <Box>
    <Typography variant="subtitle2" component="h3" sx={{ mb: 1 }}>
      {title} ({papers.length})
    </Typography>
    {papers.length === 0 ? (
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {emptyMessage}
      </Typography>
    ) : (
      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <List dense disablePadding>
          {papers.map((paper, i) => (
            <ListItem key={paper.uuid} divider={i < papers.length - 1}>
              <ListItemText
                primary={paper.title}
                slotProps={{ primary: { variant: "body2" } }}
                sx={{ pr: 2 }}
              />
              <Typography
                variant="body2"
                sx={{ color: "text.secondary", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}
              >
                {formatScore(paper.avg_probability_decision)}
              </Typography>
            </ListItem>
          ))}
        </List>
      </Paper>
    )}
  </Box>
);

/** Picks the labelled papers a few-shot task shows the model as examples, then starts it. */
export const FewShotModal: React.FC<FewShotModalProps> = ({
  onClose,
  screeningTarget,
  llmConfig,
  llmConfigLoading,
  screeningMode,
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const { projectUuid } = useParams<{ projectUuid: string }>();
  const project = useTypedStoreState((state) => state.getProjectByUuid)(projectUuid);
  const papers = useTypedStoreState((state) => state.getPapersForProject)(projectUuid);

  const isGithubScreening = screeningTarget === ScreeningTarget.GITHUB_REPOSITORY;
  const itemNamePlural = isGithubScreening ? "repositories" : "papers";

  const included = useMemo(
    () => papers.filter((p) => p.human_result === JobTaskHumanResult.INCLUDE).sort(byProbability),
    [papers],
  );
  const excluded = useMemo(
    () => papers.filter((p) => p.human_result === JobTaskHumanResult.EXCLUDE).sort(byProbability),
    [papers],
  );

  // Start from the remembered selection, minus papers whose label has since changed.
  const [selectedInclusionSeeds, setSelectedInclusionSeeds] = useState<string[]>(() =>
    (project?.preferences?.few_shot?.inc_seed_papers ?? []).filter((uuid) =>
      included.some((p) => p.uuid === uuid),
    ),
  );
  const [selectedExclusionSeeds, setSelectedExclusionSeeds] = useState<string[]>(() =>
    (project?.preferences?.few_shot?.exc_seed_papers ?? []).filter((uuid) =>
      excluded.some((p) => p.uuid === uuid),
    ),
  );
  const [rememberSelection, setRememberSelection] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [starting, setStarting] = useState(false);

  const hasSeeds = selectedInclusionSeeds.length + selectedExclusionSeeds.length > 0;
  const isLastStep = activeStep === STEPS.length - 1;

  const startFewShotJob = useCallback(async () => {
    if (!llmConfig) return;
    setStarting(true);
    try {
      await createJob(
        projectUuid,
        llmConfig,
        createFewShotPromptingConfig(
          selectedInclusionSeeds,
          selectedExclusionSeeds,
          rememberSelection,
          screeningTarget,
        ),
        screeningMode,
      );
      onClose();
    } catch (e) {
      console.error("Error creating job:", e);
      toast.error("Error creating the few-shot task.");
      setStarting(false);
    }
  }, [
    llmConfig,
    projectUuid,
    selectedInclusionSeeds,
    selectedExclusionSeeds,
    rememberSelection,
    screeningTarget,
    screeningMode,
    onClose,
  ]);

  if (!project) {
    return null;
  }

  const pick = (uuids: string[], from: PaperReadWithAvgProbability[]) =>
    from.filter((p) => uuids.includes(p.uuid));

  return (
    <Dialog
      open
      onClose={onClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="md"
      aria-labelledby="few-shot-dialog-title"
      aria-describedby="few-shot-dialog-description"
      data-testid="few-shot-dialog"
      slotProps={{ paper: { sx: { borderRadius: fullScreen ? 0 : 3 } } }}
    >
      <DialogTitle id="few-shot-dialog-title" sx={{ fontWeight: 600, pr: 7 }}>
        Few-shot screening
      </DialogTitle>
      <IconButton
        aria-label="Close"
        onClick={onClose}
        sx={{ position: "absolute", right: 12, top: 12 }}
      >
        <CloseIcon />
      </IconButton>
      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 3, py: 3 }}>
        <Typography
          id="few-shot-dialog-description"
          variant="body2"
          sx={{ color: "text.secondary" }}
        >
          The model sees the {itemNamePlural} you pick here as examples of what to include and
          exclude. Choose from {itemNamePlural} you have evaluated manually; the ones the models
          found least likely to include are listed first.
        </Typography>

        <Stepper nonLinear activeStep={activeStep} alternativeLabel={fullScreen}>
          {STEPS.map((label, index) => {
            const count =
              index === 0
                ? selectedInclusionSeeds.length
                : index === 1
                  ? selectedExclusionSeeds.length
                  : null;
            return (
              <Step key={label} completed={count != null && count > 0 && index !== activeStep}>
                <StepButton
                  data-testid={`few-shot-step-${index}`}
                  onClick={() => setActiveStep(index)}
                  disabled={index === 2 && !hasSeeds}
                  optional={
                    count != null && (
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {count} selected
                      </Typography>
                    )
                  }
                >
                  {label}
                </StepButton>
              </Step>
            );
          })}
        </Stepper>

        {activeStep === 0 && (
          <SeedList
            papers={included}
            selected={selectedInclusionSeeds}
            onChange={setSelectedInclusionSeeds}
            testId="few-shot-inclusion-list"
            label={`included ${itemNamePlural}`}
            emptyMessage={`No ${itemNamePlural} are labelled as included yet. Evaluate ${itemNamePlural} manually first.`}
          />
        )}
        {activeStep === 1 && (
          <SeedList
            papers={excluded}
            selected={selectedExclusionSeeds}
            onChange={setSelectedExclusionSeeds}
            testId="few-shot-exclusion-list"
            label={`excluded ${itemNamePlural}`}
            emptyMessage={`No ${itemNamePlural} are labelled as excluded yet. Evaluate ${itemNamePlural} manually first.`}
          />
        )}
        {activeStep === 2 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Box
              component="dl"
              sx={{
                display: "grid",
                gridTemplateColumns: "auto minmax(0, 1fr)",
                columnGap: 2,
                rowGap: 0.5,
                m: 0,
                typography: "body2",
                "& dt": { color: "text.secondary" },
                "& dd": { m: 0, overflowWrap: "anywhere" },
              }}
            >
              <dt>Model</dt>
              <dd data-testid="few-shot-model">
                {llmConfig ? (
                  `${llmConfig.model_name} (${llmConfig.provider_name})`
                ) : llmConfigLoading ? (
                  <Skeleton
                    width={220}
                    aria-label="Loading your model selection"
                    sx={{ display: "inline-block", maxWidth: "100%" }}
                  />
                ) : (
                  <Box component="span" sx={{ color: "error.main" }}>
                    Not selected
                  </Box>
                )}
              </dd>
              <dt>Screening mode</dt>
              <dd data-testid="few-shot-screening-mode">
                {screeningModeLabel(screeningMode, isGithubScreening).value}
              </dd>
            </Box>
            {!llmConfig && !llmConfigLoading && (
              <Alert severity="warning" sx={{ borderRadius: 2 }} data-testid="few-shot-no-model">
                No model is selected. Close this dialog, choose a provider and model in the task
                form, and start few-shot screening from there.
              </Alert>
            )}
            <SeedSummary
              title="Inclusion examples"
              papers={pick(selectedInclusionSeeds, included)}
              emptyMessage="None selected."
            />
            <SeedSummary
              title="Exclusion examples"
              papers={pick(selectedExclusionSeeds, excluded)}
              emptyMessage="None selected."
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={rememberSelection}
                  onChange={(e) => setRememberSelection(e.target.checked)}
                  slotProps={{ input: { "data-testid": "few-shot-remember-checkbox" } as object }}
                />
              }
              label="Remember these examples for this project"
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        {activeStep > 0 && (
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => setActiveStep(activeStep - 1)}
            data-testid="few-shot-back-button"
          >
            Back
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        {!isLastStep && (
          <Button onClick={onClose} color="inherit">
            Cancel
          </Button>
        )}
        {isLastStep ? (
          <Button
            variant="contained"
            startIcon={
              starting ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeIcon />
            }
            disabled={!hasSeeds || !llmConfig || starting}
            onClick={startFewShotJob}
            data-testid="few-shot-start-button"
          >
            Start few-shot screening
          </Button>
        ) : (
          <Button
            variant="contained"
            disabled={activeStep === 1 && !hasSeeds}
            onClick={() => setActiveStep(activeStep + 1)}
            data-testid="few-shot-next-button"
          >
            {activeStep === 0 ? "Next: exclusion examples" : "Next: review"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
