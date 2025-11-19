import { useCallback, useEffect, useState } from "react";
import { CircleAlert } from "lucide-react";

export const EventStream = () => {
  const event_url = "/api/v1/event-queue";
  const [connected, setConnected] = useState(false);
  const startLogStream = useCallback(() => {
    const eventSource = new EventSource(event_url);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    eventSource.onopen = (_ev) => {
      console.log("SSE connected to " + event_url);
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log(data);
    };

    eventSource.onerror = (error) => {
      console.error("SSE error:", error);
      eventSource.close();
      setConnected(false);
    };

    return () => {
      eventSource.close();
      setConnected(false);
    };
  }, []);
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
  ) : null;
};
