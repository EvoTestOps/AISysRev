import { useState } from "react";
import Skeleton from "react-loading-skeleton";
import { Button } from "../components/Button";
import { Layout } from "../components/Layout";
import { useConfig } from "../config/config";
import { CircleX, Pencil, Save } from "lucide-react";
import { Card } from "../components/Card";

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
                className="border border-gray-300 rounded-lg py-2 px-4 w-full shadow-sm focus:outline-none"
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

export const SettingsPage = () => {
  return (
    <Layout title="Settings">
      <Card>
        <SettingEntry
          title="OpenRouter API key"
          config_key="openrouter_api_key"
        />
        <hr />
        <SettingEntry title="OpenAI API key" config_key="openai_api_key" />
      </Card>
    </Layout>
  );
};
