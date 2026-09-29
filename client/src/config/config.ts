import { useCallback, useEffect, useState } from "react";
import axios from "axios";

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
      } catch (e: any) {
        setError(e?.message || "Update failed");
      } finally {
        setLoading(false);
      }
    },
    [name, refresh]
  );

  const remove = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const params = new URLSearchParams({ name });
      await axios.delete(`/api/v1/setting?${params.toString()}`);
      setSetting(null);
    } catch (e: any) {
      setError(e?.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  }, [name]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { setting, loading, error, refresh, update, remove };
}
