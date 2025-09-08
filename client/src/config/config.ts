import { useCallback, useEffect, useState } from "react";
import axios from "axios";

export const OPENROUTER_API_URL =
  "https://openrouter.ai/api/v1/chat/completions";

export const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

type SettingRead = {
  uuid: string;
  name: string;
  value: string;
  secret: boolean;
};

type SettingCreate = {
  name: string;
  value: string;
  secret?: boolean;
};

export function useConfig(name: string) {
  const [setting, setSetting] = useState<SettingRead | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const params = new URLSearchParams({ name });
      await new Promise((resolve) => setTimeout(() => resolve(0), 500));
      const { data } = await axios.get<SettingRead>(
        `/api/v1/setting?${params.toString()}`
      );
      setSetting(data ?? null);
      return data ?? null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setError(e?.message || "Request failed");
      setSetting(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [name]);

  const update = useCallback(
    async (update: Omit<SettingCreate, "name">) => {
      setError(null);
      setLoading(true);
      try {
        await axios.post("/api/v1/setting", { name, ...update });
        await refresh();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        setError(e?.message || "Update failed");
      } finally {
        setLoading(false);
      }
    },
    [name, refresh]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { setting, loading, error, refresh, update };
}
