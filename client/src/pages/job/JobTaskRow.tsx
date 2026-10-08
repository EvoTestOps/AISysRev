import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { Link } from "wouter";
import { PaperDetails } from "../../components/paperList/PaperDetails";
import { PaperRow, PaperRowStatus } from "../../components/paperList/PaperRow";
import { JobTaskRead } from "../../services/api/client";
import { DecisionPill } from "./result/DecisionPill";
import { isErroredTask, overallDecision, taskStatusLabel } from "./taskResult";

type JobTaskRowProps = {
  task: JobTaskRead;
  taskHref: string;
  isGithubScreening: boolean;
};

/** The probability column's text when the task has no probability. */
const rowStatus = (task: JobTaskRead): PaperRowStatus => {
  if (isErroredTask(task)) {
    return { label: "Error", tone: "error", tooltip: task.error ?? undefined };
  }
  return overallDecision(task.result) ? { label: "—" } : { label: taskStatusLabel(task.status) };
};

/** A paper in a job's list: its result for this job, expandable to a summary. */
export const JobTaskRow: React.FC<JobTaskRowProps> = ({ task, taskHref, isGithubScreening }) => {
  const [open, setOpen] = useState(false);
  const overall = overallDecision(task.result);

  return (
    <PaperRow
      data-testid={`job-task-row-${task.paper_id}`}
      paperId={task.paper_id}
      title={task.title}
      hasFullText={false}
      probability={overall?.probability}
      status={rowStatus(task)}
      open={open}
      onToggle={() => setOpen(!open)}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5 }}>
          {overall && <DecisionPill value={overall.include} labels={["Include", "Exclude"]} />}
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Status: {taskStatusLabel(task.status)}
          </Typography>
          <Button
            component={Link}
            href={taskHref}
            size="small"
            endIcon={<ArrowForwardIcon />}
            data-testid={`job-task-open-${task.paper_id}`}
            sx={{ ml: "auto" }}
          >
            Open result
          </Button>
        </Box>
        {task.error && (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {task.error}
          </Alert>
        )}
        {overall?.reason && (
          <Box component="section">
            <Typography
              variant="overline"
              component="h4"
              sx={{ display: "block", color: "text.secondary", lineHeight: 2 }}
            >
              Reasoning
            </Typography>
            <Typography
              variant="body2"
              sx={{ lineHeight: 1.7, whiteSpace: "pre-wrap", maxWidth: "80ch" }}
            >
              {overall.reason}
            </Typography>
          </Box>
        )}
        <PaperDetails
          doi={task.doi}
          abstract={task.abstract}
          isGithubScreening={isGithubScreening}
        />
      </Box>
    </PaperRow>
  );
};
