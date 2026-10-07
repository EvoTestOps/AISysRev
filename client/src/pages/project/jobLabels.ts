import {
  JobPromptingType,
  JobScreeningMode,
  JobWithStats,
  ScreeningTarget,
} from "../../state/types";

/** One labelled fact about how a job screens, e.g. "Evaluation mode: All criteria together". */
export type JobField = {
  key: "llm" | "evaluation" | "prompting" | "screening";
  label: string;
  value: string;
  /** A second line under the value, e.g. the LLM's provider. */
  detail?: string;
  /** What the value means. */
  tooltip: string;
};

const isGithubJob = (job: JobWithStats) =>
  job.prompting_config.screening_target === ScreeningTarget.GITHUB_REPOSITORY;

// Values use the same words as the "Create task" form.
const evaluationMode = (job: JobWithStats): Pick<JobField, "value" | "tooltip"> =>
  job.prompting_config.screening_type === JobPromptingType.PER_CRITERIA
    ? {
        value: "One call per criterion",
        tooltip: "Each criterion is evaluated in its own model call.",
      }
    : { value: "All criteria together", tooltip: "One model call evaluates all criteria." };

const promptingStrategy = (job: JobWithStats): Pick<JobField, "value" | "tooltip"> => {
  switch (job.prompting_config.screening_type) {
    case JobPromptingType.PER_CRITERIA:
      return {
        value: "Zero-shot (fixed)",
        tooltip: "Per-criterion evaluation always prompts without examples.",
      };
    case JobPromptingType.FEW_SHOT:
      return {
        value: "Few-shot",
        tooltip: "Papers you labelled are added to the prompt as examples.",
      };
    default:
      return {
        value: "Zero-shot",
        tooltip: "The model screens with only the criteria, without examples.",
      };
  }
};

const screeningMode = (job: JobWithStats): Pick<JobField, "value" | "tooltip"> => {
  switch (job.screening_mode) {
    case JobScreeningMode.PDF:
      return {
        value: "Full text (PDF)",
        tooltip: "The model reads excerpts of each paper's PDF.",
      };
    case JobScreeningMode.AUTOMATIC:
      return {
        value: "Full text when available",
        tooltip: "Papers with a PDF are screened on their full text, the rest on the abstract.",
      };
    default:
      return isGithubJob(job)
        ? {
            value: "Name, description & README",
            tooltip: "The model reads each repository's name, description and README.",
          }
        : {
            value: "Title & abstract",
            tooltip: "The model reads each paper's title and abstract.",
          };
  }
};

/** How a job screens, as labelled fields: LLM, evaluation mode, prompting, screening mode. */
export const jobFields = (job: JobWithStats, providerTitle?: string): JobField[] => [
  {
    key: "llm",
    label: "LLM",
    value: job.llm_config.model_name,
    detail: providerTitle ?? job.llm_config.provider_name,
    tooltip: "The model, and the provider it was called through.",
  },
  { key: "evaluation", label: "Evaluation mode", ...evaluationMode(job) },
  { key: "prompting", label: "Prompting strategy", ...promptingStrategy(job) },
  { key: "screening", label: "Screening mode", ...screeningMode(job) },
];

const createdTime = (job: JobWithStats) =>
  job.created_at ? new Date(job.created_at).getTime() : Number.POSITIVE_INFINITY;

/**
 * Run numbers per model: the first job a project ran with a model is Run #1,
 * the next with the same model Run #2, and so on, by creation time.
 */
export const jobRunNumbers = (jobs: JobWithStats[]): Record<string, number> => {
  const runs: Record<string, number> = {};
  const counts: Record<string, number> = {};
  [...jobs]
    .sort((a, b) => createdTime(a) - createdTime(b) || a.uuid.localeCompare(b.uuid))
    .forEach((job) => {
      const model = job.llm_config.model_name;
      counts[model] = (counts[model] ?? 0) + 1;
      runs[job.uuid] = counts[model];
    });
  return runs;
};

/** Newest first, as the list of screening tasks shows them. */
export const newestFirst = (jobs: JobWithStats[]) =>
  [...jobs].sort((a, b) => createdTime(b) - createdTime(a) || b.uuid.localeCompare(a.uuid));

/** e.g. "mock-small · Run #2", for breadcrumbs and labels outside the card. */
export const jobDisplayName = (job: JobWithStats, runNumber: number | undefined) =>
  runNumber === undefined
    ? job.llm_config.model_name
    : `${job.llm_config.model_name} · Run #${runNumber}`;

const startedFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** e.g. "4 Oct, 12:43", or null for jobs without a creation time. */
export const jobStartedAt = (job: JobWithStats) =>
  job.created_at ? startedFormat.format(new Date(job.created_at)) : null;

/** Percentage of the job's papers screened, successfully or not. */
export const jobProgress = (job: JobWithStats) => {
  const { success, failed, total } = job.stats;
  return total === 0 ? 0 : Math.round(((success + failed) / total) * 100);
};
