import { JobPromptingType, JobScreeningMode } from "../../../../state/types";
import { FieldGroup, FieldLabel, SegmentedButton } from "../controls";
import { CreateTaskForm } from "../useCreateTaskForm";

type ScreeningModeSelectorProps = {
  form: CreateTaskForm;
  disabled: boolean;
};

/** What the LLM reads: the abstract, the PDF, or the PDF when there is one. */
export const ScreeningModeSelector: React.FC<ScreeningModeSelectorProps> = ({ form, disabled }) => {
  const { screeningMode, setScreeningMode } = form;
  const isPerCriterion = form.promptingStrategy === JobPromptingType.PER_CRITERIA;
  return (
    <FieldGroup disabled={disabled}>
      <FieldLabel
        label="Screening mode"
        tooltip="Choose what content is used for screening papers. Automatic uses PDF mode for papers with a PDF attached and Abstract for the rest."
      />
      <div className="grid grid-cols-3 gap-2">
        <SegmentedButton
          testId="screening-mode-abstract-button"
          selected={screeningMode === JobScreeningMode.TEXT}
          onSelect={() => setScreeningMode(JobScreeningMode.TEXT)}
        >
          <span>Abstract</span>
        </SegmentedButton>
        <SegmentedButton
          testId="screening-mode-pdf-button"
          selected={screeningMode === JobScreeningMode.PDF}
          disabled={isPerCriterion}
          onSelect={() => setScreeningMode(JobScreeningMode.PDF)}
        >
          <span>PDF</span>
        </SegmentedButton>
        <SegmentedButton
          testId="screening-mode-automatic-button"
          selected={screeningMode === JobScreeningMode.AUTOMATIC}
          disabled={isPerCriterion}
          onSelect={() => setScreeningMode(JobScreeningMode.AUTOMATIC)}
        >
          <span>Automatic</span>
        </SegmentedButton>
      </div>
      {isPerCriterion && (
        <p className="text-xs text-amber-600 -mt-1">
          PDF/Automatic screening modes aren't available with per-criterion evaluation yet
        </p>
      )}
    </FieldGroup>
  );
};
