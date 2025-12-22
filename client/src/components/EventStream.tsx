import { useCallback, useEffect, useState } from "react";
import { CircleAlert } from "lucide-react";
import * as z from "zod";

const EventData = z.object({
  timestamp: z.string(),
  event_name: z.number(),
  value: z.record(z.any()),
});

type EventData = z.infer<typeof EventData>;

const EventDataList: React.FC<{ logs: Array<EventData> }> = ({ logs }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-2 left-2 z-50 bg-slate-800/90 p-2 pl-3 pr-3 text-xs text-white rounded-lg flex flex-col items-start gap-2 overflow-y-scroll">
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

  const _onMessage = useCallback((event: MessageEvent<unknown>) => {
    const { data } = event;
    if (typeof data === "string") {
      const dataJson = JSON.parse(data);
      console.log(dataJson);
      const parsedData = EventData.safeParse(dataJson);
      if (!parsedData.error) {
        setLogs((logs) => [...logs, parsedData.data]);
      }
    }
  }, []);

  const startLogStream = useCallback(() => {
    const eventSource = new EventSource(event_url);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    eventSource.onopen = (_ev) => {
      console.log("SSE connected to " + event_url);
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
