import Alert from "@mui/material/Alert";
import { ModelPicker } from "../ModelPicker";
import { ProviderSettings } from "../ProviderSettings";
import { CreateTaskForm } from "../../hooks/useCreateTaskForm";

type JevScreeningFieldsProps = {
  form: CreateTaskForm;
};

/**
 * Provider settings and model for screening with TypeSafe Jev. The screening
 * and evaluation modes are under Customize, as for LLMs; Jev can't take
 * examples, so it is always zero-shot.
 */
export const JevScreeningFields: React.FC<JevScreeningFieldsProps> = ({ form }) => {
  // Jev uses another provider's API key (OpenRouter's), which it does not list
  // among its own config parameters.
  const apiKey = form.provider?.api_key_config_parameter;

  return (
    <>
      <Alert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
        Jev answers every criterion with a probability and an include/exclude decision, without
        written reasoning. By default it asks all criteria in parallel in a single request. It
        screens zero-shot only. Requests go through OpenRouter using your OpenRouter API key.
      </Alert>
      <ProviderSettings form={form} requiredSettings={apiKey ? [apiKey] : []} />
      <ModelPicker form={form} />
    </>
  );
};
