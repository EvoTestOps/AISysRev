import {
  JobPromptingType,
  JobScreeningMode,
  JobWithStats,
  ScreeningTarget,
} from "../../state/types";

export const SCREENING_TYPE_BADGES: Partial<Record<JobPromptingType, string>> = {
  [JobPromptingType.ZERO_SHOT]: "ZS",
  [JobPromptingType.FEW_SHOT]: "FS",
  [JobPromptingType.PER_CRITERIA]: "PC",
};

export const screeningModeLabel = (job: JobWithStats): string => {
  switch (job.screening_mode) {
    case JobScreeningMode.TEXT:
      return job.prompting_config.screening_target === ScreeningTarget.GITHUB_REPOSITORY
        ? "GitHub"
        : "Abstract";
    case JobScreeningMode.PDF:
      return "PDF";
    case JobScreeningMode.AUTOMATIC:
      return "Automatic";
  }
};

export const truncatedModelName = (name: string) =>
  name.length > 30 ? name.substring(0, 17) + "..." : name;

/** Percentage of the job's papers screened, successfully or not. */
export const jobProgress = (job: JobWithStats) => {
  const { success, failed, total } = job.stats;
  return total === 0 ? 0 : Math.round(((success + failed) / total) * 100);
};
