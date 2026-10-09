import CloseIcon from "@mui/icons-material/Close";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { useTypedStoreState } from "../state/store";
import { eventNameLabel } from "./EventStream";

/** Dev-only: opens a drawer listing the server-sent events received so far. */
export const EventLogButton: React.FC = () => {
  const [open, setOpen] = useState(false);
  const logs = useTypedStoreState((state) => state.eventLogs);
  return (
    <>
      <Tooltip title="Event log">
        <IconButton
          aria-label="Event log"
          data-testid="event-log-button"
          onClick={() => setOpen(true)}
        >
          <Badge badgeContent={logs.length} color="primary" max={99}>
            <ReceiptLongOutlinedIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      <Drawer
        anchor="bottom"
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{ paper: { sx: { maxHeight: "50vh" } } }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Event log
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {logs.length} {logs.length === 1 ? "event" : "events"}
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton aria-label="Close event log" onClick={() => setOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider />
        <Box sx={{ overflowY: "auto", px: 2, py: 1, fontFamily: "monospace", fontSize: 12 }}>
          {logs.length === 0 ? (
            <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
              No events yet.
            </Typography>
          ) : (
            // Newest first.
            [...logs].reverse().map((log, i) => (
              <Box
                key={logs.length - i}
                sx={{ display: "flex", gap: 2, py: 0.5, borderBottom: 1, borderColor: "divider" }}
              >
                <Box component="span" sx={{ color: "text.secondary", flexShrink: 0 }}>
                  {log.timestamp}
                </Box>
                <Box component="span" sx={{ fontWeight: 600, flexShrink: 0 }}>
                  {eventNameLabel(log.event_name)}
                </Box>
                <Box component="span" sx={{ wordBreak: "break-all" }}>
                  {JSON.stringify(log.value)}
                </Box>
              </Box>
            ))
          )}
        </Box>
      </Drawer>
    </>
  );
};
