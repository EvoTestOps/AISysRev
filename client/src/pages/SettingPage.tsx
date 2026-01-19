import { useEffect, useState } from "react";
import * as z from "zod";
import Skeleton from "react-loading-skeleton";
import { Button } from "../components/Button";
import { Layout } from "../components/Layout";
import { useConfig } from "../config/config";
import { CircleX, Pencil, Save } from "lucide-react";
import { Card } from "../components/Card";
import { H4 } from "../components/Typography";

type SettingEntryProps = {
  config_key: string;
  title: string;
};

const SettingEntry: React.FC<SettingEntryProps> = ({ title, config_key }) => {
  const {
    setting,
    loading,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    error: _error,
    refresh,
    update,
  } = useConfig(config_key);
  const [editMode, setEditMode] = useState(false);
  const [value, setValue] = useState("");

  return (
    <>
      <div>
        <span className="font-bold">{loading ? <Skeleton /> : title}</span>
      </div>
      <div>
        {loading && <Skeleton />}
        {!loading && setting === null && !editMode && (
          <Button
            onClick={(e) => {
              e.preventDefault();
              setEditMode(true);
            }}
            variant="green"
          >
            Set
          </Button>
        )}
        <div className="flex flex-row gap-2">
          {!loading && setting !== null && !editMode && (
            <>
              <input
                type="password"
                disabled
                className="rounded-lg py-2 px-4 w-full focus:outline-none"
                value={setting.value}
                data-1p-ignore
              />
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  setEditMode(true);
                }}
                variant="green"
              >
                <div className="flex flex-row gap-2 items-center font-semibold">
                  <Pencil />
                  <span>Edit</span>
                </div>
              </Button>
            </>
          )}
          {!loading && editMode && (
            <>
              <input
                type="password"
                className="border border-gray-300 bg-white rounded-lg mt-2 py-2 px-4 w-full shadow-sm focus:outline-none"
                placeholder="Value"
                disabled={loading}
                value={value}
                data-1p-ignore
                onChange={(e) => {
                  setValue(e.target.value);
                  e.preventDefault();
                }}
              />
              <Button
                variant="green"
                disabled={value === setting?.value || loading}
                onClick={(e) => {
                  e.preventDefault();
                  if (value !== "") {
                    update({
                      value,
                    });
                    setEditMode(false);
                    setValue("");
                    refresh();
                  }
                }}
              >
                <div className="flex flex-row gap-2 items-center font-semibold">
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
                <div className="flex flex-row gap-2 items-center font-semibold">
                  <CircleX />
                  <span>Cancel</span>
                </div>
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );
};

const ConfigParameterSchema = z.object({
  key: z.string(),
  title: z.string(),
  type: z.enum(["string", "number", "boolean"]).default("string"),
  defaultValue: z
    .union([z.string(), z.number(), z.boolean()])
    .nullable()
    .optional(),
  secret: z.boolean(),
});

const ProviderConfigParamsResponseSchema = z.object({
  title: z.string(),
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
      .then((res) => {
        return res.json().then((jsonData) => {
          const contents = ProviderConfigParamsMapSchema.parse(jsonData);
          setEntries(contents);
        });
      })
      .catch();
  }, []);
  return (
    <Layout title="Settings">
      <Card>
        {Object.keys(entries).map((key) => {
          const entry = entries[key];
          if (entry.config_parameters.length === 0) {
            return null;
          }
          return (
            <div key={`${key}_container`} className="p-4 bg-gray-100">
              <H4>{entry.title}</H4>
              <div className="pt-4">
                {entry.config_parameters.map((setting) => {
                  return (
                    <SettingEntry
                      key={setting.key}
                      title={setting.title}
                      config_key={setting.key}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </Card>
    </Layout>
  );
};
