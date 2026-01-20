import { useEffect, useMemo, useState } from "react";
import * as z from "zod";
import Skeleton from "react-loading-skeleton";
import { Button } from "../components/Button";
import { Layout } from "../components/Layout";
import { useConfig } from "../config/config";
import { CircleX, Pencil, Save, KeyRound } from "lucide-react";
import { Card } from "../components/Card";
import { H4 } from "../components/Typography";

type SettingEntryProps = {
  config_key: string;
  title: string;
  description: string | null;
};

const StatusPill = ({
  kind,
  label,
}: {
  kind: "set" | "missing";
  label: string;
}) => {
  const base =
    "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ring-1";
  if (kind === "set") {
    return (
      <span
        className={`${base} bg-emerald-50 text-emerald-700 ring-emerald-200`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        {label}
      </span>
    );
  }
  return (
    <span className={`${base} bg-amber-50 text-amber-700 ring-amber-200`}>
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      {label}
    </span>
  );
};

const SettingEntry: React.FC<SettingEntryProps> = ({
  title,
  config_key,
  description,
}) => {
  const { setting, loading, refresh, update } = useConfig(config_key);

  const [editMode, setEditMode] = useState(false);
  const [value, setValue] = useState("");

  const isSet = !loading && setting !== null;
  const canSave = !loading && value.trim() !== "" && value !== setting?.value;

  useEffect(() => {
    if (editMode) setValue("");
  }, [editMode]);

  return (
    <div className="flex flex-col gap-3 rounded-xl border-0 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold text-slate-900">
            {loading ? <Skeleton width={160} /> : title}
          </span>
          {!loading && (
            <StatusPill
              kind={isSet ? "set" : "missing"}
              label={isSet ? "Key set" : "Not set"}
            />
          )}
        </div>

        <p className="mt-1 text-xs text-slate-500">
          {loading ? (
            <Skeleton width={260} />
          ) : description !== null ? (
            description
          ) : (
            ""
          )}
        </p>
      </div>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-105">
        {!loading && !editMode && (
          <div className="flex items-center gap-2">
            {setting !== null ? (
              <>
                <div className="relative w-full">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    disabled
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-10 py-2.5 text-sm text-slate-700 shadow-sm outline-none"
                    value={setting.value}
                    data-1p-ignore
                  />
                </div>

                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    setEditMode(true);
                  }}
                  variant="green"
                >
                  <div className="flex flex-row items-center gap-2 font-semibold">
                    <Pencil />
                    <span>Update</span>
                  </div>
                </Button>
              </>
            ) : (
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  setEditMode(true);
                }}
                variant="green"
              >
                Set value
              </Button>
            )}
          </div>
        )}
        {!loading && editMode && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                className="w-full rounded-xl border border-slate-200 bg-white px-10 py-2.5 text-sm text-slate-900 shadow-sm outline-none ring-0 placeholder:text-slate-400 focus:border-slate-300 focus:ring-4 focus:ring-slate-200/60"
                placeholder="Paste or type value..."
                disabled={loading}
                value={value}
                data-1p-ignore
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="green"
                disabled={!canSave}
                onClick={(e) => {
                  e.preventDefault();
                  if (value.trim() !== "") {
                    update({ value: value.trim() });
                    setEditMode(false);
                    setValue("");
                    refresh();
                  }
                }}
              >
                <div className="flex flex-row items-center gap-2 font-semibold">
                  <Save />
                  <span>Save</span>
                </div>
              </Button>
              <Button
                variant="red"
                disabled={loading}
                onClick={(e) => {
                  e.preventDefault();
                  refresh();
                  setEditMode(false);
                  setValue("");
                }}
              >
                <div className="flex flex-row items-center gap-2 font-semibold">
                  <CircleX />
                  <span>Cancel</span>
                </div>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ConfigParameterSchema = z.object({
  key: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  type: z.enum(["string", "number", "boolean"]).default("string"),
  defaultValue: z
    .union([z.string(), z.number(), z.boolean()])
    .nullable()
    .optional(),
  secret: z.boolean(),
});

const ProviderConfigParamsResponseSchema = z.object({
  title: z.string(),
  description: z.string(),
  config_parameters: z.array(ConfigParameterSchema),
});

const ProviderConfigParamsMapSchema = z.record(
  z.string(),
  ProviderConfigParamsResponseSchema,
);
type ProviderConfigParamsMap = z.infer<typeof ProviderConfigParamsMapSchema>;

export const SettingsPage = () => {
  const [entries, setEntries] = useState<ProviderConfigParamsMap>({});

  useEffect(() => {
    fetch("/api/v1/llm/provider_config_params")
      .then((res) => res.json())
      .then((jsonData) => {
        const contents = ProviderConfigParamsMapSchema.parse(jsonData);
        setEntries(contents);
      })
      .catch();
  }, []);

  const providerKeys = useMemo(() => Object.keys(entries), [entries]);

  return (
    <Layout title="Settings">
      <Card>
        <div className="border-b border-slate-200 bg-white px-6 py-5">
          <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage settings related to AiSysRev or LLM providers.
          </p>
        </div>
        <div className="space-y-4 bg-slate-50 px-6 py-6">
          {providerKeys.map((key) => {
            const entry = entries[key];
            if (!entry || entry.config_parameters.length === 0) return null;

            return (
              <section
                key={`${key}_container`}
                className="rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <H4>{entry.title}</H4>
                    <p className="mt-1 text-sm text-slate-600">
                      {entry.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 p-5">
                  {entry.config_parameters.map((setting) => (
                    <SettingEntry
                      key={setting.key}
                      title={setting.title}
                      config_key={setting.key}
                      description={setting.description}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </Card>
    </Layout>
  );
};
