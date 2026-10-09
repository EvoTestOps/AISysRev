import { useEffect, useState } from "react";
import { JobTaskDetail, TypedStatusError } from "../../../services/api/client";
import { fetchJobTaskDetail } from "../../../services/jobTaskService";

/** One task of a job, with its result and prompts. `notFound` on a 404. */
export const useJobTaskDetail = (jobUuid: string, taskUuid: string) => {
  const [task, setTask] = useState<JobTaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Cancels the request when stepping to another task or leaving the page.
    const controller = new AbortController();
    const { signal } = controller;
    const load = async () => {
      setLoading(true);
      setNotFound(false);
      setError(null);
      try {
        const fetched = await fetchJobTaskDetail(jobUuid, taskUuid, signal);
        if (!signal.aborted) setTask(fetched);
      } catch (e: unknown) {
        if (signal.aborted) return;
        if (e instanceof TypedStatusError && e.status === 404) {
          setNotFound(true);
        } else {
          console.error("Failed to fetch job task:", e);
          setError("Failed to load the result.");
        }
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [jobUuid, taskUuid]);

  return { task, loading, notFound, error };
};
