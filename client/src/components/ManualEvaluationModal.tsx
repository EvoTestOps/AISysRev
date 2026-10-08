import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import HelpOutlineIcon from "@mui/icons-material/HelpOutlineOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Link from "@mui/material/Link";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { alpha, useTheme } from "@mui/material/styles";
import { useEffect, useCallback, useState } from "react";
import { LlmModelCard, LlmModelCardSkeleton } from "./LlmModelCard";
import { FadeIn } from "./FadeIn";
import {
  JobScreeningMode,
  JobTaskHumanResult,
  JobTaskStatus,
  PromptingConfig,
  ScreeningTarget,
} from "../state/types";
import { api } from "../services/api";
import { AlertMessage } from "./AlertMessage";
import { useTypedStoreActions } from "../state/store";
import { PaperReadWithAvgProbability } from "../services/api/client";
import { criterionId } from "../pages/job/taskResult";

type ManualEvaluationProps = {
  currentTaskUuid?: string;
  inclusionCriteria: string[];
  exclusionCriteria: string[];
  papers: PaperReadWithAvgProbability[];
  paperUuid: string | null;
  screeningTarget: ScreeningTarget;
  onClose: () => void;
  onEvaluated: () => void;
};

type ModelSuggestion = {
  modelName: string;
  binary: string | null;
  likertScale: string | null;
  probability: number | null;
  screeningType: PromptingConfig["screening_type"] | null;
  screeningMode: JobScreeningMode | null;
};

/** The mean likelihood that a criterion applies, over the model runs that judged it. */
type CriterionAverage = { probability: number; runs: number };

type ModelResults = {
  suggestions: ModelSuggestion[];
  /** By criterion id, e.g. IC1 or EC2. */
  criteria: Record<string, CriterionAverage>;
};

// TODO: Refactor this to use Redux
const getModelResults = async (paperUuid: string, signal: AbortSignal): Promise<ModelResults> => {
  const data = await api.get("/api/v1/jobtask", {
    query: { paper_uuid: paperUuid },
    overrides: { signal },
  });
  const done = data.filter((entry) => entry.status !== JobTaskStatus.ERROR);

  const samples: Record<string, number[]> = {};
  const addSample = (name: string, probability: number) =>
    (samples[criterionId(name)] ??= []).push(probability);
  for (const { result } of done) {
    if (!result) continue;
    if ("mode" in result) {
      for (const [id, answer] of Object.entries(result.criterion_results)) {
        if (!("error" in answer)) addSample(id, answer.probability_decision);
      }
    } else {
      for (const criterion of [...result.inclusion_criteria, ...result.exclusion_criteria]) {
        addSample(criterion.name, criterion.decision.probability_decision);
      }
    }
  }
  const criteria = Object.fromEntries(
    Object.entries(samples).map(([id, values]) => [
      id,
      { probability: values.reduce((sum, p) => sum + p, 0) / values.length, runs: values.length },
    ]),
  );

  const suggestions = done.flatMap((entry) => {
    // Quick fix: PER_CRITERIA results don't have the same format as ZS or FS,
    // skip to avoid erroring.
    if (entry.result && "mode" in entry.result) return [];
    const decision = entry.result?.overall_decision ?? null;
    // Jev results have no Likert scale.
    const likert = decision && "likert_decision" in decision ? decision.likert_decision : null;
    return [
      {
        modelName: entry.llm_config.model_name,
        binary: decision ? (decision.binary_decision ? "Include" : "Exclude") : null,
        likertScale: typeof likert === "string" ? likert : null,
        probability: decision ? decision.probability_decision : null,
        // The generated string literals match the values of the app's enums
        screeningType: entry.prompting_config.screening_type as PromptingConfig["screening_type"],
        screeningMode: entry.screening_mode as JobScreeningMode,
      } satisfies ModelSuggestion,
    ];
  });

  return { suggestions, criteria };
};

/** A column of the dialog: a heading that stays put above content that scrolls on its own. */
const Pane: React.FC<{
  heading: React.ReactNode;
  children: React.ReactNode;
  sx?: React.ComponentProps<typeof Box>["sx"];
}> = ({ heading, children, sx }) => (
  <Box
    component="section"
    sx={[
      {
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        minHeight: { md: 0 },
        borderStyle: "solid",
        borderColor: "divider",
        borderWidth: 0,
      },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  >
    <Box sx={{ px: 3, pt: 2.5, pb: 2 }}>{heading}</Box>
    <Box sx={{ flex: { md: 1 }, minHeight: { md: 0 }, overflowY: { md: "auto" }, px: 3, pb: 3 }}>
      {children}
    </Box>
  </Box>
);

const PaneTitle: React.FC<{ children: React.ReactNode; component?: React.ElementType }> = ({
  children,
  component = "h2",
}) => (
  <Typography
    variant="overline"
    component={component}
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 1,
      minHeight: 24,
      lineHeight: 1.5,
      fontWeight: 600,
      color: "text.secondary",
    }}
  >
    {children}
  </Typography>
);

const formatPercent = (probability: number) => `${Math.round(probability * 100)} %`;

const CriteriaSection: React.FC<{
  title: string;
  idPrefix: "IC" | "EC";
  criteria: string[];
  averages: Record<string, CriterionAverage> | undefined;
  color: "success" | "error";
}> = ({ title, idPrefix, criteria, averages, color }) => (
  <Box sx={{ "& + &": { mt: 3 } }}>
    <Typography variant="subtitle2" component="h3" sx={{ mb: 1 }}>
      {title}
    </Typography>
    {criteria.length === 0 ? (
      <AlertMessage message="No criteria." />
    ) : (
      <Box
        component="ol"
        sx={{
          m: 0,
          p: 0,
          listStyle: "none",
          borderRadius: 2,
          border: 1,
          borderColor: (theme) => alpha(theme.palette[color].main, 0.25),
          bgcolor: (theme) => alpha(theme.palette[color].main, 0.05),
        }}
      >
        {criteria.map((text, i) => {
          const id = `${idPrefix}${i + 1}`;
          const average = averages?.[id];
          return (
            <Box
              component="li"
              key={id}
              sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: 1.5,
                px: 2,
                py: 1.5,
                "& + &": {
                  borderTop: 1,
                  borderColor: (theme) => alpha(theme.palette[color].main, 0.15),
                },
              }}
            >
              <Typography
                variant="caption"
                sx={{ fontWeight: 600, color: `${color}.dark`, minWidth: 24, lineHeight: "20px" }}
              >
                {id}
              </Typography>
              <Typography variant="body2" sx={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
                {text}
              </Typography>
              {average && (
                <Tooltip
                  title={`On average the models judged ${id} to apply with ${formatPercent(average.probability)} likelihood (${average.runs} ${average.runs === 1 ? "run" : "runs"}).`}
                >
                  <Box sx={{ width: 52, flexShrink: 0, textAlign: "right" }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: "20px" }}>
                      {formatPercent(average.probability)}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={average.probability * 100}
                      color={color}
                      aria-label={`${id} average likelihood`}
                      sx={{
                        mt: 0.5,
                        height: 4,
                        borderRadius: 2,
                        bgcolor: (theme) => alpha(theme.palette[color].main, 0.15),
                      }}
                    />
                  </Box>
                </Tooltip>
              )}
            </Box>
          );
        })}
      </Box>
    )}
  </Box>
);

const SUGGESTION_LIST = {
  display: "flex",
  flexDirection: "column",
  gap: 1.5,
  m: 0,
  p: 0,
  listStyle: "none",
} as const;

/** The model suggestions, paper and criteria for one paper. Remounted for each paper. */
const EvaluationContent: React.FC<{
  paper: PaperReadWithAvgProbability;
  inclusionCriteria: string[];
  exclusionCriteria: string[];
  isGithubScreening: boolean;
}> = ({ paper, inclusionCriteria, exclusionCriteria, isGithubScreening }) => {
  // TODO: Refactor this to use redux
  const [modelResults, setModelResults] = useState<ModelResults | null>(null);
  const [modelResultsError, setModelResultsError] = useState<string | null>(null);
  const modelSuggestions = modelResults?.suggestions;
  const criteriaRuns = Math.max(
    0,
    ...Object.values(modelResults?.criteria ?? {}).map((c) => c.runs),
  );

  useEffect(() => {
    // Cancels the request if the dialog closes before it answers.
    const controller = new AbortController();
    const { signal } = controller;
    const load = async () => {
      try {
        const results = await getModelResults(paper.uuid, signal);
        if (!signal.aborted) setModelResults(results);
      } catch (e: unknown) {
        if (signal.aborted) return;
        console.error("Failed to fetch model results:", e);
        setModelResultsError("Failed to load the model suggestions.");
      }
    };
    load();
    return () => controller.abort();
  }, [paper.uuid]);

  const includeCount = modelSuggestions?.filter((s) => s.binary === "Include").length ?? 0;
  const excludeCount = modelSuggestions?.filter((s) => s.binary === "Exclude").length ?? 0;

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: "grid",
        overflowY: { xs: "auto", md: "hidden" },
        gridTemplateColumns: {
          xs: "minmax(0, 1fr)",
          md: "17rem minmax(0, 1fr) minmax(18rem, 26rem)",
        },
        gridTemplateRows: { md: "minmax(0, 1fr)" },
        alignContent: "start",
      }}
    >
      <Pane
        sx={{ order: { xs: 2, md: 0 }, borderTopWidth: { xs: 1, md: 0 }, bgcolor: "grey.50" }}
        heading={
          <>
            <PaneTitle>
              Model suggestions
              {modelSuggestions && modelSuggestions.length > 0 && (
                <Chip size="small" label={modelSuggestions.length} sx={{ height: 20 }} />
              )}
            </PaneTitle>
            {modelSuggestions && modelSuggestions.length > 1 && (
              <Box sx={{ mt: 1 }}>
                <Box
                  aria-hidden
                  sx={{
                    display: "flex",
                    gap: "2px",
                    height: 6,
                    borderRadius: 3,
                    overflow: "hidden",
                    bgcolor: "action.disabledBackground",
                  }}
                >
                  <Box sx={{ flex: includeCount, bgcolor: "success.main" }} />
                  <Box sx={{ flex: excludeCount, bgcolor: "error.main" }} />
                  <Box sx={{ flex: modelSuggestions.length - includeCount - excludeCount }} />
                </Box>
                <Box
                  sx={{
                    mt: 0.5,
                    display: "flex",
                    justifyContent: "space-between",
                    typography: "caption",
                    color: "text.secondary",
                  }}
                >
                  <span>{includeCount} include</span>
                  <span>{excludeCount} exclude</span>
                </Box>
              </Box>
            )}
          </>
        }
      >
        {modelSuggestions?.length === 0 && <AlertMessage message="No model suggestions." />}
        {modelResultsError ? (
          <AlertMessage message={modelResultsError} />
        ) : modelSuggestions === undefined ? (
          <Box
            component="ul"
            aria-busy="true"
            aria-label="Loading model suggestions"
            sx={SUGGESTION_LIST}
          >
            <LlmModelCardSkeleton />
            <LlmModelCardSkeleton />
          </Box>
        ) : (
          <FadeIn component="ul" sx={SUGGESTION_LIST}>
            {modelSuggestions.map((suggestion, i) => (
              <LlmModelCard key={i} {...suggestion} isGithubScreening={isGithubScreening} />
            ))}
          </FadeIn>
        )}
      </Pane>

      <Pane
        sx={{ order: { xs: 0, md: 1 }, borderLeftWidth: { md: 1 } }}
        heading={
          <>
            <PaneTitle component="p">
              {isGithubScreening ? "Repository" : "Paper"} #{paper.paper_id}
            </PaneTitle>
            <Typography
              id="manual-evaluation-title"
              variant="h6"
              component="h2"
              sx={{
                mt: 1,
                pr: { xs: 5, md: 0 },
                lineHeight: 1.35,
                overflowWrap: "anywhere",
              }}
            >
              {paper.title}
            </Typography>
          </>
        }
      >
        {(paper.doi || (paper.pdf_file_uuid && paper.pdf_filename)) && (
          <Box
            component="dl"
            sx={{
              display: "grid",
              gridTemplateColumns: "auto minmax(0, 1fr)",
              columnGap: 1.5,
              rowGap: 0.5,
              m: 0,
              mb: 2,
              typography: "body2",
              "& dt": { color: "text.secondary" },
              "& dd": { m: 0, overflowWrap: "anywhere" },
            }}
          >
            {paper.doi && (
              <>
                <dt>{isGithubScreening ? "Repository URL" : "DOI"}</dt>
                <dd>
                  <Link
                    href={
                      isGithubScreening
                        ? /^https?:\/\//i.test(paper.doi)
                          ? paper.doi
                          : undefined
                        : encodeURI(`https://doi.org/${paper.doi}`)
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {paper.doi}
                  </Link>
                </dd>
              </>
            )}
            {paper.pdf_file_uuid && paper.pdf_filename && (
              <>
                <dt>Full text</dt>
                <dd>
                  <Link
                    href={`/api/v1/files/${paper.pdf_file_uuid}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {paper.pdf_filename}
                  </Link>
                </dd>
              </>
            )}
          </Box>
        )}
        <Typography
          id="manual-evaluation-abstract"
          variant="body1"
          sx={{ fontSize: "0.9375rem", lineHeight: 1.75, whiteSpace: "pre-line", maxWidth: "75ch" }}
        >
          {paper.abstract}
        </Typography>
      </Pane>

      <Pane
        sx={{
          order: { xs: 1, md: 2 },
          borderTopWidth: { xs: 1, md: 0 },
          borderLeftWidth: { md: 1 },
        }}
        heading={
          <>
            <PaneTitle>Criteria</PaneTitle>
            {criteriaRuns > 0 && (
              <Typography variant="caption" component="p" sx={{ color: "text.secondary", mt: 0.5 }}>
                Average likelihood that each criterion applies, across {criteriaRuns} model{" "}
                {criteriaRuns === 1 ? "run" : "runs"}
              </Typography>
            )}
          </>
        }
      >
        <CriteriaSection
          title="Inclusion criteria"
          idPrefix="IC"
          criteria={inclusionCriteria}
          averages={modelResults?.criteria}
          color="success"
        />
        <CriteriaSection
          title="Exclusion criteria"
          idPrefix="EC"
          criteria={exclusionCriteria}
          averages={modelResults?.criteria}
          color="error"
        />
      </Pane>
    </Box>
  );
};

export const ManualEvaluationModal: React.FC<ManualEvaluationProps> = ({
  inclusionCriteria,
  exclusionCriteria,
  papers,
  paperUuid,
  screeningTarget,
  onClose,
  onEvaluated,
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("md"));
  const hasKeyboard = useMediaQuery("(hover: hover) and (pointer: fine)");
  const currentPaper = papers.find((p) => p.uuid === paperUuid);

  const addHumanResult = useTypedStoreActions((actions) => actions.addHumanResult);

  const isGithubScreening = screeningTarget === ScreeningTarget.GITHUB_REPOSITORY;

  const handleAddHumanResult = useCallback(
    (humanResult: JobTaskHumanResult) => {
      if (!paperUuid || !currentPaper) return;

      try {
        addHumanResult({
          projectUuid: currentPaper.project_uuid,
          paperUuid,
          humanResult,
        });
        onEvaluated();
      } catch (error) {
        console.error("Error adding human result:", error);
      }
    },
    [paperUuid, currentPaper, onEvaluated, addHumanResult],
  );

  // Escape is handled by the dialog itself.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't decide on a held-down key or a browser shortcut such as Ctrl+E.
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "y" || e.key === "Y" || e.key === "i" || e.key === "I") {
        handleAddHumanResult(JobTaskHumanResult.INCLUDE);
      } else if (e.key === "u" || e.key === "U") {
        handleAddHumanResult(JobTaskHumanResult.UNSURE);
      } else if (e.key === "n" || e.key === "N" || e.key === "e" || e.key === "E") {
        handleAddHumanResult(JobTaskHumanResult.EXCLUDE);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleAddHumanResult]);

  if (!currentPaper) return null;

  const decisions = [
    {
      result: JobTaskHumanResult.EXCLUDE,
      label: "Exclude",
      keys: "N / E",
      color: "error",
      icon: <CloseIcon />,
      testId: "manual-evaluation-exclude-button",
    },
    {
      result: JobTaskHumanResult.UNSURE,
      label: "Unsure",
      keys: "U",
      color: "warning",
      icon: <HelpOutlineIcon />,
      testId: "manual-evaluation-unsure-button",
    },
    {
      result: JobTaskHumanResult.INCLUDE,
      label: "Include",
      keys: "Y / I",
      color: "success",
      icon: <CheckIcon />,
      testId: "manual-evaluation-include-button",
    },
  ] as const;

  return (
    <Dialog
      open
      onClose={onClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth={false}
      aria-labelledby="manual-evaluation-title"
      aria-describedby="manual-evaluation-abstract"
      slotProps={{
        paper: {
          sx: {
            height: fullScreen ? undefined : "100%",
            borderRadius: fullScreen ? 0 : 3,
          },
        },
      }}
    >
      <IconButton
        aria-label="Close"
        onClick={onClose}
        data-testid="manual-evaluation-close-button"
        sx={{ position: "absolute", right: 12, top: 12, zIndex: 1 }}
      >
        <CloseIcon />
      </IconButton>
      <EvaluationContent
        key={currentPaper.uuid}
        paper={currentPaper}
        inclusionCriteria={inclusionCriteria}
        exclusionCriteria={exclusionCriteria}
        isGithubScreening={isGithubScreening}
      />
      <DialogActions
        sx={{
          justifyContent: "center",
          gap: { xs: 1, sm: 2 },
          px: { xs: 2, sm: 3 },
          py: 2,
          borderTop: 1,
          borderColor: "divider",
          "& > :not(style) ~ :not(style)": { ml: 0 },
        }}
      >
        {decisions.map(({ result, label, keys, color, icon, testId }) => (
          <Button
            key={result}
            variant="contained"
            color={color}
            size="large"
            startIcon={icon}
            onClick={() => handleAddHumanResult(result)}
            data-testid={testId}
            sx={{ flex: { xs: 1, sm: "none" }, minWidth: { sm: 160 } }}
          >
            {label}
            {hasKeyboard && (
              <Box
                component="span"
                sx={{ display: { xs: "none", sm: "inline" }, ml: 1, opacity: 0.8, fontWeight: 400 }}
              >
                ({keys})
              </Box>
            )}
          </Button>
        ))}
      </DialogActions>
    </Dialog>
  );
};
