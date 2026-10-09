import Autocomplete from "@mui/material/Autocomplete";
import CircularProgress from "@mui/material/CircularProgress";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import { useMemo } from "react";
import { ModelConfiguration } from "./ModelConfiguration";
import { CreateTaskForm } from "../hooks/useCreateTaskForm";

/**
 * The model, searchable (a provider can offer hundreds). Until the provider's
 * models are loaded it is a placeholder field, without the dropdown's test id.
 */
export const ModelPicker: React.FC<{ form: CreateTaskForm }> = ({ form }) => {
  const modelIds = useMemo(
    () => form.availableModels.map((model) => model.id).sort((a, b) => a.localeCompare(b)),
    [form.availableModels],
  );

  return (
    <>
      {form.isProviderSelected && form.modelsLoaded ? (
        <Autocomplete
          options={modelIds}
          value={form.selectedModel?.value ?? null}
          onChange={(_, id) => {
            form.setSelectedModel(id ? { name: id, value: id } : undefined);
            form.setIsModelSelected(id !== null);
          }}
          openOnFocus
          autoHighlight
          fullWidth
          noOptionsText="No matching models"
          renderOption={({ key, ...props }, id) => (
            <li key={key} {...props} data-testid={`llm-model-dropdown-option-${id}`}>
              {id}
            </li>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Model"
              placeholder="Search models"
              slotProps={{
                ...params.slotProps,
                htmlInput: { ...params.slotProps.htmlInput, "data-testid": "llm-model-dropdown" },
              }}
            />
          )}
        />
      ) : (
        <TextField
          label="Model"
          fullWidth
          disabled
          value=""
          placeholder={form.isProviderSelected ? "Loading models…" : "Choose a provider first"}
          slotProps={{
            inputLabel: { shrink: true },
            input: form.isProviderSelected
              ? {
                  endAdornment: (
                    <InputAdornment position="end">
                      <CircularProgress size={18} />
                    </InputAdornment>
                  ),
                }
              : undefined,
          }}
        />
      )}
      <ModelConfiguration
        isLlmSelected={form.isModelSelected}
        modelFormValues={form.modelFormValues}
        modelParametersSchema={form.modelParametersSchema}
        setModelFormValue={form.setModelFormValues}
      />
    </>
  );
};
