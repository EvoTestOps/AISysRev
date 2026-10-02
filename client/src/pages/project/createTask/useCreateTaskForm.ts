import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useLocation } from "wouter";
import { DropdownOption } from "../../../components/DropDownMenus";
import { useConfig } from "../../../config/config";
import { GLOBAL_PROVIDER_OVERRIDES } from "../../../config/globalProviderOverrides";
import { createJob } from "../../../services/jobService";
import { retrieve_models } from "../../../services/llmService";
import { useTypedStoreActions, useTypedStoreState } from "../../../state/store";
import {
  createPerCriteriaPromptingConfig,
  createZeroShotPromptingConfig,
  JobPromptingType,
  JobScreeningMode,
  LlmConfig,
  Provider,
  ScreeningTarget,
} from "../../../state/types";

// Jev answers typed questions with probabilities instead of generating text,
// so it gets its own screening method rather than sitting among the LLMs.
export const JEV_PROVIDER_NAME = "jev";

export enum ScreeningMethod {
  LLM = "LLM",
  JEV = "JEV",
}

/** The prompting types a task can be created with. */
export type PromptingStrategy =
  | JobPromptingType.ZERO_SHOT
  | JobPromptingType.FEW_SHOT
  | JobPromptingType.PER_CRITERIA;

type AvailableModel = { id: string; created: number; object: "model"; owned_by: string };

const schemaDefaults = (
  schema: Provider["model_parameters_json_schema"] | null | undefined,
): Record<string, unknown> => {
  if (!schema) {
    return {};
  }
  return Object.keys(schema.properties).reduce(
    (prev, curr) => ({ ...prev, [curr]: schema.properties[curr].default }),
    {},
  );
};

/**
 * State and actions of the "Create task" card. Lives in ProjectPage because the
 * few-shot modal, opened from the card, needs the same selections.
 */
export const useCreateTaskForm = (projectUuid: string, screeningTarget: ScreeningTarget) => {
  const [, navigate] = useLocation();
  const providers = useTypedStoreState((state) => state.providers);
  const fetchJobsForProject = useTypedStoreActions((actions) => actions.fetchJobsForProject);

  const [screeningMethod, setScreeningMethod] = useState<ScreeningMethod>(ScreeningMethod.LLM);
  const [promptingStrategy, setPromptingStrategy] = useState<PromptingStrategy>(
    JobPromptingType.ZERO_SHOT,
  );
  const [screeningMode, setScreeningMode] = useState<JobScreeningMode>(JobScreeningMode.TEXT);

  const [selectedProvider, setSelectedProvider] = useState<DropdownOption | undefined>(undefined);
  const [isProviderSelected, setIsProviderSelected] = useState(false);
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [selectedModel, setSelectedModel] = useState<DropdownOption | undefined>(undefined);
  const [isModelSelected, setIsModelSelected] = useState(false);

  const isJevScreening = screeningMethod === ScreeningMethod.JEV;
  const provider = providers.find((p) => p.name === selectedProvider?.value);
  const jevProvider = providers.find((p) => p.name === JEV_PROVIDER_NAME);
  const llmProviders = providers.filter((p) => p.name !== JEV_PROVIDER_NAME);

  const configParameters = provider?.config_parameters;
  const modelParametersSchema = provider?.model_parameters_json_schema;
  const providerParametersSchema = provider?.provider_parameters_json_schema;

  const defaultModelValues = useMemo(
    () => schemaDefaults(modelParametersSchema),
    [modelParametersSchema],
  );
  const defaultProviderValues = useMemo(
    () => schemaDefaults(providerParametersSchema),
    [providerParametersSchema],
  );

  const [modelFormValues, setModelFormValues] = useState<Record<string, unknown>>({});
  useEffect(() => {
    setModelFormValues(defaultModelValues);
  }, [defaultModelValues]);

  const [providerFormValues, setProviderFormValues] = useState<Record<string, unknown>>({});
  useEffect(() => {
    setProviderFormValues(defaultProviderValues);
  }, [defaultProviderValues]);

  const resetModel = () => {
    setAvailableModels([]);
    setModelsLoaded(false);
    setIsModelSelected(false);
    setSelectedModel(undefined);
  };

  const selectProvider = (option?: DropdownOption) => {
    setSelectedProvider(option);
    resetModel();
  };

  const selectScreeningMethod = (method: ScreeningMethod) => {
    if (method === screeningMethod) {
      return;
    }
    setScreeningMethod(method);
    resetModel();
    if (method === ScreeningMethod.JEV && jevProvider) {
      // Jev screens abstracts, asking all criteria in parallel in one request.
      setSelectedProvider({ name: jevProvider.title, value: jevProvider.name });
      setIsProviderSelected(true);
      setPromptingStrategy(JobPromptingType.ZERO_SHOT);
      setScreeningMode(JobScreeningMode.TEXT);
    } else {
      setSelectedProvider(undefined);
      setIsProviderSelected(false);
    }
  };

  // One useConfig call per entry in GLOBAL_PROVIDER_OVERRIDES.
  const { setting: openrouterForceZdrSetting, loading: globalOverridesLoading } = useConfig(
    GLOBAL_PROVIDER_OVERRIDES[0].settingKey,
  );
  const globalOverrideSettingValues = useMemo<Record<string, string | undefined>>(
    () => ({
      [GLOBAL_PROVIDER_OVERRIDES[0].settingKey]: openrouterForceZdrSetting?.value,
    }),
    [openrouterForceZdrSetting],
  );

  const forcedBooleanKeys = useMemo(() => {
    const keys: Record<string, boolean> = {};
    // Don't apply defaults until the stored values are known, otherwise a
    // default-on override would flash on (and stick in the form) for a user who
    // has explicitly turned it off.
    if (globalOverridesLoading) {
      return keys;
    }
    for (const override of GLOBAL_PROVIDER_OVERRIDES) {
      if (selectedProvider?.value !== override.providerName) {
        continue;
      }
      // Same fallback the backend uses: an unset setting takes the config
      // parameter's default.
      const defaultValue = configParameters?.find(
        (param) => param.key === override.settingKey,
      )?.defaultValue;
      const value =
        globalOverrideSettingValues[override.settingKey] ??
        (defaultValue == null ? undefined : String(defaultValue));
      if (value === "true") {
        keys[override.providerParameterKey] = true;
      }
    }
    return keys;
  }, [selectedProvider, globalOverrideSettingValues, globalOverridesLoading, configParameters]);

  useEffect(() => {
    const forcedKeys = Object.keys(forcedBooleanKeys);
    if (forcedKeys.length === 0) {
      return;
    }
    setProviderFormValues((vals) => {
      const alreadyForced = forcedKeys.every((key) => vals[key] === true);
      if (alreadyForced) {
        return vals;
      }
      const forcedVals = { ...vals };
      for (const key of forcedKeys) {
        forcedVals[key] = true;
      }
      return forcedVals;
    });
    setModelsLoaded(false);
  }, [forcedBooleanKeys]);

  // (Re)load the model list whenever the provider or its parameters change.
  useEffect(() => {
    if (!isProviderSelected || modelsLoaded || !selectedProvider?.value) {
      return;
    }
    const providerName = selectedProvider.value;
    retrieve_models(providerName, providerFormValues)
      .then((models) => {
        setAvailableModels(models);
        setModelsLoaded(true);
      })
      .catch((error) => {
        console.error("Failed to fetch available models for provider " + providerName, error);
      });
  }, [isProviderSelected, modelsLoaded, selectedProvider, providerFormValues]);

  const llmConfig = useMemo<LlmConfig | null>(
    () =>
      selectedModel && selectedProvider
        ? {
            model_name: selectedModel.value,
            provider_name: selectedProvider.value,
            model_parameters: modelFormValues,
            provider_parameters: providerFormValues,
          }
        : null,
    [selectedModel, selectedProvider, modelFormValues, providerFormValues],
  );

  const createTask = useCallback(async () => {
    if (promptingStrategy === JobPromptingType.FEW_SHOT) {
      // The few-shot modal collects the seed papers and creates the job.
      navigate(`/project/${projectUuid}/few_shot`);
      return;
    }
    if (!selectedModel) {
      toast.error("Please select a model before creating a task.");
      return;
    }
    if (!llmConfig) {
      toast.error("Please select a provider before creating a task.");
      return;
    }
    const promptingConfig =
      promptingStrategy === JobPromptingType.PER_CRITERIA
        ? createPerCriteriaPromptingConfig(screeningTarget)
        : createZeroShotPromptingConfig(screeningTarget);
    try {
      await createJob(projectUuid, llmConfig, promptingConfig, screeningMode);
      fetchJobsForProject(projectUuid);
    } catch (e) {
      console.error("Error creating job:", e);
      toast.error("Error creating job");
    }
  }, [
    promptingStrategy,
    navigate,
    projectUuid,
    selectedModel,
    llmConfig,
    screeningTarget,
    screeningMode,
    fetchJobsForProject,
  ]);

  return {
    screeningMethod,
    isJevScreening,
    selectScreeningMethod,
    jevProvider,
    llmProviders,

    provider,
    selectedProvider,
    selectProvider,
    isProviderSelected,
    setIsProviderSelected,
    configParameters,
    providerParametersSchema,
    providerFormValues,
    setProviderFormValues,
    forcedBooleanKeys,

    availableModels,
    modelsLoaded,
    setModelsLoaded,
    selectedModel,
    setSelectedModel,
    isModelSelected,
    setIsModelSelected,
    modelParametersSchema,
    modelFormValues,
    setModelFormValues,

    promptingStrategy,
    setPromptingStrategy,
    screeningMode,
    setScreeningMode,

    createTask,
  };
};

export type CreateTaskForm = ReturnType<typeof useCreateTaskForm>;
