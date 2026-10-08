import { useEffect, useState } from "react";
import { JobTaskRead } from "../../../services/api/client";
import { fetchJobTasks } from "../../../services/jobTaskService";

/** A job's tasks, one per paper, in paper id order. */
export const useJobTasks = (jobUuid: string) => {
  const [tasks, setTasks] = useState<JobTaskRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Cancels the request when the job changes or the page unmounts.
    const controller = new AbortController();
    const { signal } = controller;
    const load = async () => {
      setLoading(true);
      try {
        const fetched = await fetchJobTasks(jobUuid, signal);
        if (signal.aborted) return;
        setTasks(fetched);
        setError(null);
      } catch (e: unknown) {
        if (signal.aborted) return;
        console.error("Failed to fetch job tasks:", e);
        setError("Failed to load the screened papers.");
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [jobUuid]);

  return { tasks, loading, error };
};
