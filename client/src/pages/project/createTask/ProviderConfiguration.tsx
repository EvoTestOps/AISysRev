import classNames from "classnames";
import { Provider } from "../../../state/types";

type ProviderConfigurationProps = {
  modelSelected: boolean;
  providerParametersSchema?: Provider["provider_parameters_json_schema"];
  providerFormValues: Record<string, unknown>;
  setProviderFormValue: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  setModelsLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  forcedBooleanKeys?: Record<string, boolean>;
};

export const ProviderConfiguration: React.FC<ProviderConfigurationProps> = ({
  modelSelected,
  providerParametersSchema,
  providerFormValues,
  setProviderFormValue,
  setModelsLoaded,
  forcedBooleanKeys = {},
}) => {
  if (
    providerParametersSchema === null ||
    providerParametersSchema === undefined ||
    Object.keys(providerParametersSchema.properties).length === 0
  ) {
    return null;
  }
  const cx = classNames(
    "rounded-lg p-2 h-8 bg-whitecursor-pointer text-sm border-1 border-slate-400 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 bg-white accent-slate-800",
  );
  return providerParametersSchema ? (
    <details className="border border-slate-200 rounded-lg p-4 flex flex-col bg-slate-50 shadow-sm w-full">
      <summary className="flex cursor-pointer list-none items-center justify-between">
        <div>
          <div className="text-sm font-medium text-slate-900">Advanced</div>
          <div className="mt-0.5 text-xs text-slate-500 flex gap-2">Provider configuration.</div>
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
        {Object.keys(providerParametersSchema.properties).map((key) => {
          const property = providerParametersSchema.properties[key];
          return (
            <div className="flex flex-col justify-between gap-1 w-full" key={`property_${key}`}>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">{property.title}</label>
                <span className="text-sm font-medium text-slate-600">
                  {providerFormValues[key] !== undefined &&
                  property.type !== "string" &&
                  property.type !== "boolean" &&
                  providerFormValues[key] !== "" ? (
                    <>{providerFormValues[key]}</>
                  ) : (
                    ""
                  )}
                </span>
              </div>
              {property.type === "boolean" &&
                (() => {
                  const forced = Boolean(forcedBooleanKeys[key]);
                  const enabled = forced || Boolean(providerFormValues[key]);
                  const disabled = modelSelected || forced;
                  return (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      disabled={disabled}
                      data-testid={`property_${key}_input`}
                      onClick={() => {
                        setProviderFormValue((vals) => ({
                          ...vals,
                          [key]: !enabled,
                        }));
                        setModelsLoaded(false);
                      }}
                      className={classNames(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer disabled:cursor-not-allowed",
                        {
                          "bg-slate-800": enabled,
                          "bg-slate-300": !enabled,
                        },
                      )}
                    >
                      <span
                        className={classNames(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          {
                            "translate-x-6": enabled,
                            "translate-x-1": !enabled,
                          },
                        )}
                      />
                    </button>
                  );
                })()}
              {property.type === "number" && (
                <input
                  type="range"
                  disabled={modelSelected}
                  className={cx}
                  data-testid={`property_${key}_input`}
                  min={property.minimum}
                  max={property.maximum}
                  step={0.1}
                  onChange={(e) => {
                    const val = e.target.value === "" ? "" : parseFloat(e.target.value);
                    if (!Number.isNaN(val)) {
                      setProviderFormValue((vals) => ({
                        ...vals,
                        [key]: val,
                      }));
                      setModelsLoaded(false);
                    }
                  }}
                  // @ts-expect-error Ok
                  value={providerFormValues[key]}
                />
              )}
              {property.type === "string" && (
                <input
                  type="text"
                  disabled={modelSelected}
                  className={cx}
                  data-testid={`property_${key}_input`}
                  onChange={(e) => {
                    setProviderFormValue((vals) => ({
                      ...vals,
                      [key]: e.target.value,
                    }));
                    setModelsLoaded(false);
                  }}
                  // @ts-expect-error Ok
                  value={providerFormValues[key]}
                />
              )}
              {property.type === "integer" && (
                <input
                  type="number"
                  disabled={modelSelected}
                  className={cx}
                  data-testid={`property_${key}_input`}
                  onChange={(e) => {
                    const val = e.target.value === "" ? "" : parseInt(e.target.value, 10);
                    if (!Number.isNaN(val)) {
                      setProviderFormValue((vals) => ({
                        ...vals,
                        [key]: val,
                      }));
                      setModelsLoaded(false);
                    }
                  }}
                  // @ts-expect-error Ok
                  value={providerFormValues[key]}
                />
              )}
              <p className="text-xs text-gray-500">{property.description}</p>
              {forcedBooleanKeys[key] && (
                <p className="text-xs text-amber-600">
                  Forced on by your global provider settings.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </details>
  ) : null;
};
