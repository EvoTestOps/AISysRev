import { ListChecks, Sparkles } from "lucide-react";
import { JobPromptingType, JobScreeningMode } from "../../../../state/types";
import { FieldGroup, FieldLabel, RadioCard } from "../controls";
import { CreateTaskForm } from "../../hooks/useCreateTaskForm";

type EvaluationModeSelectorProps = {
  form: CreateTaskForm;
  disabled: boolean;
};

/** Whether one LLM call evaluates all criteria, or one call per criterion. */
export const EvaluationModeSelector: React.FC<EvaluationModeSelectorProps> = ({
  form,
  disabled,
}) => {
  const { promptingStrategy, setPromptingStrategy } = form;
  const isPerCriterion = promptingStrategy === JobPromptingType.PER_CRITERIA;
  return (
    <FieldGroup disabled={disabled}>
      <FieldLabel
        label="Evaluation mode"
        tooltip="Choose how criteria are evaluated during screening."
      />
      <RadioCard
        testId="evaluation-mode-all-criteria-button"
        selected={!isPerCriterion}
        onSelect={() => {
          if (isPerCriterion) setPromptingStrategy(JobPromptingType.ZERO_SHOT);
        }}
        icon={<Sparkles size={16} className="text-blue-600" />}
        iconClassName="bg-blue-100"
        title="All criteria together"
        description={
          <>
            <div>One LLM call evaluates all criteria.</div>
            <div>Supports zero-shot and few-shot prompting.</div>
          </>
        }
      />
      <RadioCard
        testId="evaluation-mode-per-criterion-button"
        selected={isPerCriterion}
        onSelect={() => {
          setPromptingStrategy(JobPromptingType.PER_CRITERIA);
          // Per-criterion evaluation only screens abstracts.
          form.setScreeningMode(JobScreeningMode.TEXT);
        }}
        icon={<ListChecks size={16} className="text-purple-600" />}
        iconClassName="bg-purple-100"
        title="One call per criterion"
        description={
          <>
            <div>Runs one LLM call for each criterion.</div>
            <div>Prompting strategy is fixed for this mode.</div>
          </>
        }
      />
    </FieldGroup>
  );
};
