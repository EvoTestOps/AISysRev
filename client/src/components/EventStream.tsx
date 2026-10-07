import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import { useCallback, useEffect, useState } from "react";
import * as z from "zod";
import { useTypedStoreActions } from "../state/store";
import type { JobStats } from "../state/types";

const EventName = {
  // Events for JobTask-related things
  JOB_TASK_NOT_STARTED: 1001,
  JOB_TASK_PENDING: 1002,
  JOB_TASK_RUNNING: 1003,
  JOB_TASK_DONE: 1004,
  JOB_TASK_ERROR: 1005,
  JOB_TASK_RETRY: 1006,
  // Event for LLM-related errors
  LLM_ERROR: 2001,
  // Events for Job-related things
  JOB_COMPLETE: 3001,
  JOB_CREATED: 3002,
  JOB_PROGRESS: 3003,
  // Events for Project-related things
  PROJECT_CREATED: 4001,
  PROJECT_FILE_UPLOADED: 4002,
  // Server error
  SERVER_ERROR: 99999,
} as const;

/** The readable name of an event code, e.g. 3003 → "JOB_PROGRESS". */
export const eventNameLabel = (code: number) =>
  Object.entries(EventName).find(([, value]) => value === code)?.[0] ?? String(code);

const EventNameEnum = z.enum(EventName);
const EventData = z.object({
  timestamp: z.string(),
  event_name: EventNameEnum,
  value: z.record(z.string(), z.any()),
});

// The event log is a debugging aid, so only collect it in dev.
const collectEventLog = import.meta.env.VITE_APP_ENV === "dev";

export const EventStream = () => {
  const event_url = "/api/v1/event-queue";
  const [disconnected, setDisconnected] = useState(false);

  const addEventLog = useTypedStoreActions((actions) => actions.addEventLog);
  const updateJobStats = useTypedStoreActions((actions) => actions.updateJobStats);

  const _onMessage = useCallback(
    (event: MessageEvent<unknown>) => {
      const { data } = event;
      if (typeof data === "string") {
        const dataJson = JSON.parse(data);
        const parsedData = EventData.safeParse(dataJson);
        if (!parsedData.error) {
          const eventData = parsedData.data;
          if (collectEventLog) addEventLog(eventData);

          switch (eventData.event_name) {
            case EventName.JOB_PROGRESS:
              {
                const jobId = eventData.value.job_id;
                const stats: JobStats = eventData.value.stats;
                updateJobStats({ jobId, stats });
              }
              break;
            default:
              break;
          }
        }
      }
    },
    [addEventLog, updateJobStats],
  );

  const startLogStream = useCallback(() => {
    const eventSource = new EventSource(event_url);

    eventSource.onopen = () => setDisconnected(false);

    eventSource.onmessage = (event) => _onMessage(event);

    eventSource.onerror = (error) => {
      console.error("SSE error:", error);
      eventSource.close();
      setDisconnected(true);
    };

    return () => eventSource.close();
  }, [_onMessage]);
  useEffect(() => {
    const stop = startLogStream();
    return () => {
      stop();
    };
  }, [startLogStream]);

  return (
    <Snackbar open={disconnected} anchorOrigin={{ vertical: "bottom", horizontal: "left" }}>
      <Alert severity="warning" variant="filled" sx={{ width: "100%" }}>
        Live updates disconnected. Refresh the page to reconnect.
      </Alert>
    </Snackbar>
  );
};
