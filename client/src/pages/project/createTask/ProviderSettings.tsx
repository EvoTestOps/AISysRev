import { Provider } from "../../../state/types";
import { ConfigKeyCheck } from "./ConfigKeyCheck";
import { ProviderConfiguration } from "./ProviderConfiguration";
import { CreateTaskForm } from "../hooks/useCreateTaskForm";

type ProviderSettingsProps = {
  form: CreateTaskForm;
  /** Settings the provider needs before it can be used, e.g. its API key. */
  requiredSettings: Provider["config_parameters"];
};

/** The selected provider's parameters, and a warning for each missing setting. */
export const ProviderSettings: React.FC<ProviderSettingsProps> = ({ form, requiredSettings }) => {
  if (!form.isProviderSelected) {
    return null;
  }
  return (
    <>
      {form.providerParametersSchema && (
        <ProviderConfiguration
          modelSelected={form.isModelSelected}
          providerFormValues={form.providerFormValues}
          setProviderFormValue={form.setProviderFormValues}
          providerParametersSchema={form.providerParametersSchema}
          setModelsLoaded={form.setModelsLoaded}
          forcedBooleanKeys={form.forcedBooleanKeys}
        />
      )}
      {requiredSettings.map((param) => (
        <ConfigKeyCheck key={param.key} config_key={param.key} should_show title={param.title} />
      ))}
    </>
  );
};
