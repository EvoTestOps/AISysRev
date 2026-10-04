import { isPerCriteriaResult, TaskResult } from "../taskResult";
import { PerCriteriaResultView } from "./PerCriteriaResultView";
import { StructuredResultView } from "./StructuredResultView";

type TaskResultViewProps = {
  result: TaskResult;
  projectCriteria: { inclusion_criteria: string[]; exclusion_criteria: string[] };
};

/** A task's stored result, in the form its job produced. */
export const TaskResultView: React.FC<TaskResultViewProps> = ({ result, projectCriteria }) =>
  isPerCriteriaResult(result) ? (
    <PerCriteriaResultView result={result} projectCriteria={projectCriteria} />
  ) : (
    <StructuredResultView result={result} projectCriteria={projectCriteria} />
  );
