import { useState } from "react";
import { Button } from "../components/Button";
import { Layout } from "../components/Layout";
import { useConfig } from "../config/config";

export const SettingsPage = () => {
  const {
    setting,
    loading,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    error: _error,
    refresh,
    update,
  } = useConfig("openrouter_api_key");
  const [editMode, setEditMode] = useState(false);
  const [value, setValue] = useState("");

  if (loading) {
    return (
      <Layout title="Settings">
        <div className="bg-white p-4 mb-4 rounded-2xl">
          Loading...
        </div>
      </Layout>
    );
  }
  return (
    <Layout title="Settings">
      <div className="bg-white p-4 mb-4 rounded-2xl">
        <div className="grid grid-cols-2 gap-8 items-center">
          <div>
            <span className="font-bold">OpenRouter API key</span>
          </div>
          <div>
            {setting === null && !editMode && (
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
            {setting !== null && !editMode && (
              <div className="flex flex-row gap-2">
                <input
                  type="password"
                  disabled
                  className="rounded-2xl py-2 px-4 w-full focus:outline-none"
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
                  Edit
                </Button>
              </div>
            )}
            {editMode && (
              <div className="flex flex-row gap-2">
                <input
                  type="password"
                  className="border border-gray-300 rounded-2xl py-2 px-4 w-full shadow-sm focus:outline-none"
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
                    update({
                      value,
                    });
                    setEditMode(false);
                    setValue("");
                    refresh();
                  }}
                >
                  Save
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
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};
