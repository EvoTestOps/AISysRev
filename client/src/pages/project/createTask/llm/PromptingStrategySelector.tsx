import { User, Users } from "lucide-react";
import { JobPromptingType } from "../../../../state/types";
import { FieldGroup, FieldLabel, SegmentedButton } from "../controls";
import { CreateTaskForm } from "../../hooks/useCreateTaskForm";

type PromptingStrategySelectorProps = {
  form: CreateTaskForm;
  disabled: boolean;
};

/** Zero-shot, or few-shot with seed papers picked in the few-shot modal. */
export const PromptingStrategySelector: React.FC<PromptingStrategySelectorProps> = ({
  form,
  disabled,
}) => {
  const { promptingStrategy, setPromptingStrategy } = form;
  return (
    <FieldGroup disabled={disabled}>
      <FieldLabel label="Prompting strategy" />
      <p className="text-xs text-slate-500 -mt-1">Choose how examples are provided to the model.</p>
      <div className="grid grid-cols-2 gap-2">
        <SegmentedButton
          testId="prompting-strategy-zero-shot-button"
          selected={promptingStrategy === JobPromptingType.ZERO_SHOT}
          onSelect={() => setPromptingStrategy(JobPromptingType.ZERO_SHOT)}
        >
          <User size={14} />
          <span>Zero-shot</span>
        </SegmentedButton>
        <SegmentedButton
          testId="prompting-strategy-few-shot-button"
          selected={promptingStrategy === JobPromptingType.FEW_SHOT}
          onSelect={() => setPromptingStrategy(JobPromptingType.FEW_SHOT)}
        >
          <Users size={14} />
          <span>Few-shot</span>
        </SegmentedButton>
      </div>
    </FieldGroup>
  );
};
