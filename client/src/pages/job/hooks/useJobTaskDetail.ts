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
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setError(null);
    fetchJobTaskDetail(jobUuid, taskUuid)
      .then((fetched) => {
        if (!cancelled) setTask(fetched);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof TypedStatusError && e.status === 404) {
          setNotFound(true);
        } else {
          console.error("Failed to fetch job task:", e);
          setError("Failed to load the result.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [jobUuid, taskUuid]);

  return { task, loading, notFound, error };
};
