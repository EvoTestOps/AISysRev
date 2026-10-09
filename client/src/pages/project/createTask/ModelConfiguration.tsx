import { Provider } from "../../../state/types";

type ModelConfigurationProps = {
  isLlmSelected: boolean;
  modelParametersSchema?: Provider["model_parameters_json_schema"];
  modelFormValues: Record<string, unknown>;
  setModelFormValue: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
};

export const ModelConfiguration: React.FC<ModelConfigurationProps> = ({
  isLlmSelected,
  modelParametersSchema,
  modelFormValues,
  setModelFormValue,
}) => {
  if (
    modelParametersSchema === undefined ||
    Object.keys(modelParametersSchema.properties).length === 0
  ) {
    return null;
  }
  return isLlmSelected && modelParametersSchema ? (
    <details className="border border-slate-200 rounded-lg p-4 flex flex-col bg-slate-50 shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between">
        <div>
          <div className="text-sm font-medium text-slate-900">Advanced</div>
          <div className="mt-0.5 text-xs text-slate-500 flex gap-2">
            {Object.keys(modelParametersSchema.properties).map((key) => {
              const property = modelParametersSchema.properties[key];
              return (
                <span key={`property_${property.title}`}>{`${property.title}: ${
                  modelFormValues[key] !== undefined &&
                  modelFormValues[key] !== "" &&
                  modelFormValues[key]
                }`}</span>
              );
            })}
          </div>
        </div>
        <svg
          className="h-4 w-4 text-slate-500 transition-transform duration-200 group-open:rotate-180"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
            clipRule="evenodd"
          />
        </svg>
      </summary>
      <div className="mt-4">
        {Object.keys(modelParametersSchema.properties).map((key) => {
          const property = modelParametersSchema.properties[key];
          return (
            <div className="flex flex-col justify-between gap-1" key={`property_${key}`}>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">{property.title}</label>
                <span className="text-sm font-medium text-slate-600">
                  {modelFormValues[key] !== undefined && modelFormValues[key] !== "" ? (
                    <>{modelFormValues[key]}</>
                  ) : (
                    ""
                  )}
                </span>
              </div>
              {property.type === "number" && (
                <input
                  type="range"
                  className="p-2 cursor-pointer disabled:cursor-not-allowed bg-gray-200 accent-slate-800"
                  data-testid={`property_${key}_input`}
                  min={property.minimum}
                  max={property.maximum}
                  step={0.1}
                  onChange={(e) => {
                    setModelFormValue((vals) => ({
                      ...vals,
                      [key]: e.target.value,
                    }));
                  }}
                  // @ts-expect-error Ok
                  value={modelFormValues[key]}
                />
              )}
              {property.type === "integer" && (
                <input
                  type="number"
                  className="p-2 rounded-lg cursor-pointer disabled:cursor-not-allowed border-gray-400 border-2 accent-slate-800"
                  data-testid={`property_${key}_input`}
                  onChange={(e) => {
                    setModelFormValue((vals) => ({
                      ...vals,
                      [key]: e.target.value,
                    }));
                  }}
                  // @ts-expect-error Ok
                  value={modelFormValues[key]}
                />
              )}
              <p className="text-xs text-gray-500">{property.description}</p>
            </div>
          );
        })}
      </div>
    </details>
  ) : null;
};
