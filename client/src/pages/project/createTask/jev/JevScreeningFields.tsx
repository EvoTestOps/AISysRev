import { ModelPicker } from "../ModelPicker";
import { ProviderSettings } from "../ProviderSettings";
import { CreateTaskForm } from "../useCreateTaskForm";

type JevScreeningFieldsProps = {
  form: CreateTaskForm;
  itemName: string;
  isGithubScreening: boolean;
  hasFiles: boolean;
};

/**
 * Options for screening with TypeSafe Jev. Jev screens abstracts zero-shot and
 * asks every criterion in parallel in one request, so it has no screening mode,
 * evaluation mode or prompting strategy to choose.
 */
export const JevScreeningFields: React.FC<JevScreeningFieldsProps> = ({
  form,
  itemName,
  isGithubScreening,
  hasFiles,
}) => {
  // Jev uses another provider's API key (OpenRouter's), which it does not list
  // among its own config parameters.
  const apiKey = form.provider?.api_key_config_parameter;

  return (
    <>
      <div className="w-full flex flex-col gap-1 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
        <span>
          Jev screens {itemName} abstracts{isGithubScreening ? " (READMEs)" : ""} zero-shot and asks
          every criterion in parallel in a single request.
        </span>
        <span>
          Results include probabilities and include/exclude decisions, without written reasoning or
          a Likert scale.
        </span>
        <span>Requests go through OpenRouter using your OpenRouter API key.</span>
      </div>
      <ProviderSettings form={form} requiredSettings={apiKey ? [apiKey] : []} />
      <ModelPicker form={form} disabled={!hasFiles} />
    </>
  );
};
