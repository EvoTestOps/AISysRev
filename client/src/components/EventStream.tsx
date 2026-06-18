import { useCallback, useEffect, useState } from "react";
import { CircleAlert } from "lucide-react";
import * as z from "zod";
import classNames from "classnames";
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

const EventNameEnum = z.enum(EventName);
const EventData = z.object({
  timestamp: z.string(),
  event_name: EventNameEnum,
  value: z.record(z.string(), z.any()),
});

type EventData = z.infer<typeof EventData>;

const EventDataList: React.FC<{ logs: Array<EventData> }> = ({ logs }) => {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={classNames(
        "fixed bottom-0 left-0 z-50 bg-slate-800/90 m-2 p-3 text-xs text-white rounded-lg flex flex-col items-start gap-2 overflow-y-scroll max-h-[50vh]",
        {
          "w-[70vw]": open,
        },
      )}
    >
      {!open && (
        <button className="hover:cursor-pointer" onClick={() => setOpen(true)}>
          View logs ({logs.length})
        </button>
      )}
      {open && (
        <button
          className="hover:cursor-pointer text-red-500"
          onClick={() => setOpen(false)}
        >
          Close
        </button>
      )}
      {open &&
        logs.map((log, i) => (
          <div key={i} className="flex flex-row gap-2">
            <span>
              <strong>[{log.timestamp}]</strong>
            </span>
            <span>
              <strong>Event:</strong> {log.event_name}
            </span>
            <span>
              <strong>Data:</strong> {JSON.stringify(log.value)}
            </span>
          </div>
        ))}
    </div>
  );
};

export const EventStream = () => {
  const event_url = "/api/v1/event-queue";
  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState<Array<EventData>>([]);

  // const setJobsForProject = useTypedStoreActions(
  //   (actions) => actions.setJobsForProject
  // );
  const updateJobStats = useTypedStoreActions(
    (actions) => actions.updateJobStats
  );


  const _onMessage = useCallback((event: MessageEvent<unknown>) => {
    const { data } = event;
    if (typeof data === "string") {
      const dataJson = JSON.parse(data);
      const parsedData = EventData.safeParse(dataJson);
      if (!parsedData.error) {
        const eventData = parsedData.data;
        setLogs((logs) => [...logs, eventData]);

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
  }, [updateJobStats]);

  const startLogStream = useCallback(() => {
    const eventSource = new EventSource(event_url);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    eventSource.onopen = (_ev) => {
      // console.log("SSE connected to " + event_url);
      setConnected(true);
    };

    eventSource.onmessage = (event) => _onMessage(event);

    eventSource.onerror = (error) => {
      console.error("SSE error:", error);
      eventSource.close();
      setConnected(false);
    };

    return () => {
      eventSource.close();
      setConnected(false);
    };
  }, [_onMessage]);
  useEffect(() => {
    const stop = startLogStream();
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return !connected ? (
    <div className="fixed bottom-2 left-2 z-50 bg-slate-800 p-2 pl-3 pr-3 text-xs text-white rounded-lg flex flex-row items-center gap-2">
      <CircleAlert size={20} />
      <span className="text-red-400">Event stream disconnected</span>
    </div>
  ) : (
    <EventDataList logs={logs} />
  );
};
