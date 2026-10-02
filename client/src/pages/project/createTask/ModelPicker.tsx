import { DropdownMenuText } from "../../../components/DropDownMenus";
import { ModelConfiguration } from "./ModelConfiguration";
import { CreateTaskForm } from "./useCreateTaskForm";

type ModelPickerProps = {
  form: CreateTaskForm;
  disabled: boolean;
};

/** Model dropdown, filled once the selected provider's models are loaded. */
export const ModelPicker: React.FC<ModelPickerProps> = ({ form, disabled }) => (
  <>
    <label className="text-sm font-medium text-slate-700">Model</label>
    {form.modelsLoaded ? (
      <div className="flex flex-col items-start gap-1 w-full">
        <DropdownMenuText
          disabled={!form.isProviderSelected || disabled}
          testId="llm-model-dropdown"
          options={form.availableModels
            .map((model) => ({ name: model.id, value: model.id }))
            .sort((a, b) => a.name.localeCompare(b.name))}
          selected={form.selectedModel}
          onSelect={form.setSelectedModel}
          isSelected={form.isModelSelected}
          setSelected={form.setIsModelSelected}
        />
      </div>
    ) : (
      <div className="w-full p-1 bg-natural-100 border border-gray-300 h-10 rounded-lg shadow-sm bg-gray-100 focus:outline-none focus:ring-0 opacity-80 select-none text-sm" />
    )}
    <ModelConfiguration
      isLlmSelected={form.isModelSelected}
      modelFormValues={form.modelFormValues}
      modelParametersSchema={form.modelParametersSchema}
      setModelFormValue={form.setModelFormValues}
    />
  </>
);
