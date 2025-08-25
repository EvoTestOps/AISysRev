import { useCallback, useEffect } from "react";

export const EventStream = () => {
  const event_url = "http://localhost:3001/api/v1/event-queue";
  const startLogStream = useCallback(() => {
    const eventSource = new EventSource(event_url);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    eventSource.onopen = (_ev) => {
      console.log("SSE connected to " + event_url);
    };

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log(data);
    };

    eventSource.onerror = (error) => {
      console.error("SSE error:", error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);
  useEffect(() => {
    const stop = startLogStream();
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <></>;
};
