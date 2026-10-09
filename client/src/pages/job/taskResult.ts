import {
  JevStructuredResponse,
  JobTaskRead,
  PerCriteriaResult,
  StructuredResponse,
} from "../../services/api/client";
import { JobTaskStatus } from "../../state/types";

export type TaskResult = NonNullable<JobTaskRead["result"]>;

export const isPerCriteriaResult = (result: TaskResult): result is PerCriteriaResult =>
  "mode" in result;

export const isStructuredResult = (
  result: TaskResult,
): result is StructuredResponse | JevStructuredResponse => !isPerCriteriaResult(result);

export type OverallDecision = {
  include: boolean | null;
  probability: number | null;
  reason: string | null;
};

/** The task's overall decision, whatever kind of job produced it. */
export const overallDecision = (result: TaskResult | null | undefined): OverallDecision | null => {
  if (!result) {
    return null;
  }
  if (isPerCriteriaResult(result)) {
    return {
      include: result.binary_decision ?? null,
      probability: result.overall_probability ?? null,
      reason: null,
    };
  }
  return {
    include: result.overall_decision.binary_decision,
    probability: result.overall_decision.probability_decision,
    reason: result.overall_decision.reason,
  };
};

/** Probabilities to 3 decimals; 0 is a value, not a missing one. */
export const formatProbability = (probability: number | null | undefined) =>
  probability == null ? "–" : probability.toFixed(3);

// Keyed by the API's task statuses, which include CANCELLED.
const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "Not started",
  PENDING: "Pending",
  RUNNING: "Running",
  DONE: "Done",
  ERROR: "Error",
  CANCELLED: "Cancelled",
};

export const taskStatusLabel = (status: string) => STATUS_LABELS[status] ?? status;

export const isErroredTask = (task: Pick<JobTaskRead, "status">) =>
  task.status === JobTaskStatus.ERROR;

/** "IC1: text" and "IC1" both name criterion IC1. */
export const criterionId = (name: string) => name.split(":", 1)[0].trim();

/** The project's wording of a criterion id such as IC2 or EC1, if it has one. */
export const criterionText = (
  id: string,
  criteria: { inclusion_criteria: string[]; exclusion_criteria: string[] },
): string | undefined => {
  const match = /^(IC|EC)(\d+)$/.exec(criterionId(id));
  if (!match) {
    return undefined;
  }
  const list = match[1] === "IC" ? criteria.inclusion_criteria : criteria.exclusion_criteria;
  return list[Number(match[2]) - 1];
};
