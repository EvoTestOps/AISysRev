import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useLocation } from "wouter";
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

/** A provider or model choice: its display name and its identifier. */
export type DropdownOption = { name: string; value: string };

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

// The last provider and model a task was created with, preselected next time.
const LAST_SETUP_KEY = "aisysrev.lastTaskSetup";

type LastTaskSetup = { screeningMethod: ScreeningMethod; provider: string; model: string };

const readLastSetup = (): LastTaskSetup | null => {
  try {
    const raw = window.localStorage.getItem(LAST_SETUP_KEY);
    return raw ? (JSON.parse(raw) as LastTaskSetup) : null;
  } catch {
    return null;
  }
};

const saveLastSetup = (setup: LastTaskSetup) => {
  try {
    window.localStorage.setItem(LAST_SETUP_KEY, JSON.stringify(setup));
  } catch {
    // Remembering is a convenience; without storage the form starts empty.
  }
};

/**
 * State and actions of the task form. Lives in ProjectPage because the
 * few-shot modal, opened from the card, needs the same selections.
 */
export const useCreateTaskForm = (projectUuid: string, screeningTarget: ScreeningTarget) => {
  const [, navigate] = useLocation();
  const providers = useTypedStoreState((state) => state.providers);
  const fetchJobsForProject = useTypedStoreActions((actions) => actions.fetchJobsForProject);

  const [lastSetup] = useState(readLastSetup);
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

  // Preselect the last provider, then (once its models are loaded) the last
  // model. Each happens once, so clearing a selection sticks.
  const restoredProvider = useRef(false);
  useEffect(() => {
    if (restoredProvider.current || !lastSetup || providers.length === 0) {
      return;
    }
    restoredProvider.current = true;
    const saved = providers.find((p) => p.name === lastSetup.provider);
    if (!saved) {
      return;
    }
    if (lastSetup.screeningMethod === ScreeningMethod.JEV && saved.name === JEV_PROVIDER_NAME) {
      setScreeningMethod(ScreeningMethod.JEV);
    }
    setSelectedProvider({ name: saved.title, value: saved.name });
    setIsProviderSelected(true);
  }, [lastSetup, providers]);

  const restoredModel = useRef(false);
  useEffect(() => {
    if (restoredModel.current || !lastSetup || !modelsLoaded) {
      return;
    }
    restoredModel.current = true;
    if (
      selectedProvider?.value === lastSetup.provider &&
      availableModels.some((m) => m.id === lastSetup.model)
    ) {
      setSelectedModel({ name: lastSetup.model, value: lastSetup.model });
      setIsModelSelected(true);
    }
  }, [lastSetup, modelsLoaded, selectedProvider, availableModels]);

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

  /** Creates the task (or opens the few-shot modal). Resolves to whether it did. */
  const createTask = useCallback(async (): Promise<boolean> => {
    if (!selectedModel) {
      toast.error("Please select a model before creating a task.");
      return false;
    }
    if (!llmConfig) {
      toast.error("Please select a provider before creating a task.");
      return false;
    }
    const setup = {
      screeningMethod,
      provider: llmConfig.provider_name,
      model: llmConfig.model_name,
    };
    if (promptingStrategy === JobPromptingType.FEW_SHOT) {
      // The few-shot modal collects the seed papers and creates the job.
      saveLastSetup(setup);
      navigate(`/project/${projectUuid}/few_shot`);
      return true;
    }
    const promptingConfig =
      promptingStrategy === JobPromptingType.PER_CRITERIA
        ? createPerCriteriaPromptingConfig(screeningTarget)
        : createZeroShotPromptingConfig(screeningTarget);
    try {
      await createJob(projectUuid, llmConfig, promptingConfig, screeningMode);
      saveLastSetup(setup);
      fetchJobsForProject(projectUuid);
      return true;
    } catch (e) {
      console.error("Error creating job:", e);
      toast.error("Error creating job");
      return false;
    }
  }, [
    screeningMethod,
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
