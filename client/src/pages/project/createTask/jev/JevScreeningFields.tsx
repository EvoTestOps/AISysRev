import Alert from "@mui/material/Alert";
import { ModelPicker } from "../ModelPicker";
import { ProviderSettings } from "../ProviderSettings";
import { ScreeningTarget } from "../../../../state/types";
import { CreateTaskForm } from "../../hooks/useCreateTaskForm";

type JevScreeningFieldsProps = {
  form: CreateTaskForm;
  itemName: string;
  screeningTarget: ScreeningTarget;
};

/**
 * Options for screening with TypeSafe Jev. Jev screens abstracts zero-shot and
 * asks every criterion in parallel in one request, so it has no screening mode,
 * evaluation mode or prompting strategy to choose.
 */
export const JevScreeningFields: React.FC<JevScreeningFieldsProps> = ({
  form,
  itemName,
  screeningTarget,
}) => {
  // Jev uses another provider's API key (OpenRouter's), which it does not list
  // among its own config parameters.
  const apiKey = form.provider?.api_key_config_parameter;

  return (
    <>
      <Alert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
        Jev screens {itemName} abstracts
        {screeningTarget === ScreeningTarget.GITHUB_REPOSITORY ? " (READMEs)" : ""} zero-shot and
        asks every criterion in parallel in a single request. Results include probabilities and
        include/exclude decisions, without written reasoning. Requests go through OpenRouter using
        your OpenRouter API key.
      </Alert>
      <ProviderSettings form={form} requiredSettings={apiKey ? [apiKey] : []} />
      <ModelPicker form={form} />
    </>
  );
};
