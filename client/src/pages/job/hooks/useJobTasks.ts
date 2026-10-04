import { useEffect, useState } from "react";
import { JobTaskRead } from "../../../services/api/client";
import { fetchJobTasks } from "../../../services/jobTaskService";

/** A job's tasks, one per paper, in paper id order. */
export const useJobTasks = (jobUuid: string) => {
  const [tasks, setTasks] = useState<JobTaskRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchJobTasks(jobUuid)
      .then((fetched) => {
        if (!cancelled) {
          setTasks(fetched);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          console.error("Failed to fetch job tasks:", e);
          setError("Failed to load the screened papers.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [jobUuid]);

  return { tasks, loading, error };
};
