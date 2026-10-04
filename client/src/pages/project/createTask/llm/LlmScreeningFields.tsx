import { DropdownMenuText } from "../../../../components/DropDownMenus";
import { JobPromptingType } from "../../../../state/types";
import type { Project } from "../../../../state/types/project";
import { ModelPicker } from "../ModelPicker";
import { ProviderSettings } from "../ProviderSettings";
import { CreateTaskForm } from "../../hooks/useCreateTaskForm";
import { EvaluationModeSelector } from "./EvaluationModeSelector";
import { PerCriteriaLogic } from "./PerCriteriaLogic";
import { PromptingStrategySelector } from "./PromptingStrategySelector";
import { ScreeningModeSelector } from "./ScreeningModeSelector";

type LlmScreeningFieldsProps = {
  form: CreateTaskForm;
  project: Project;
  isGithubScreening: boolean;
  hasFiles: boolean;
};

/** Provider, model and prompting options for screening with a language model. */
export const LlmScreeningFields: React.FC<LlmScreeningFieldsProps> = ({
  form,
  project,
  isGithubScreening,
  hasFiles,
}) => {
  const optionsDisabled = !form.isProviderSelected || !form.isModelSelected;
  const isPerCriterion = form.promptingStrategy === JobPromptingType.PER_CRITERIA;
  // Only secrets (API keys) are required to be set; non-secret parameters such
  // as toggles fall back to their default.
  const requiredSettings = (form.configParameters ?? []).filter((param) => param.secret);

  return (
    <>
      <div className="flex flex-col items-start gap-2 w-full">
        <label className="text-sm font-medium text-slate-700">Provider</label>
        <DropdownMenuText
          disabled={false}
          testId="llm-provider-dropdown"
          options={form.llmProviders.map((provider) => ({
            name: provider.title,
            value: provider.name,
          }))}
          selected={form.selectedProvider}
          onSelect={form.selectProvider}
          isSelected={form.isProviderSelected}
          setSelected={form.setIsProviderSelected}
        />
        <ProviderSettings form={form} requiredSettings={requiredSettings} />
      </div>
      <ModelPicker form={form} disabled={!hasFiles} />
      {!isGithubScreening && <ScreeningModeSelector form={form} disabled={optionsDisabled} />}
      <EvaluationModeSelector form={form} disabled={optionsDisabled} />
      {isPerCriterion ? (
        <PerCriteriaLogic
          inclusionExpression={project.criteria.inclusion_expression}
          exclusionExpression={project.criteria.exclusion_expression}
        />
      ) : (
        <PromptingStrategySelector form={form} disabled={optionsDisabled} />
      )}
    </>
  );
};
