import { useState } from "react";
import { Link } from "wouter";
import { PaperDetails } from "../../components/paperList/PaperDetails";
import { PaperRow } from "../../components/paperList/PaperRow";
import { JobTaskRead } from "../../services/api/client";
import { DecisionPill } from "./result/DecisionPill";
import { formatProbability, isErroredTask, overallDecision, taskStatusLabel } from "./taskResult";

type JobTaskRowProps = {
  task: JobTaskRead;
  taskHref: string;
  isGithubScreening: boolean;
};

const rowValue = (task: JobTaskRead): { value: React.ReactNode; muted: boolean } => {
  if (isErroredTask(task)) {
    return { value: <span className="text-red-600 font-semibold">Error</span>, muted: false };
  }
  const overall = overallDecision(task.result);
  if (!overall) {
    return { value: taskStatusLabel(task.status), muted: true };
  }
  return { value: formatProbability(overall.probability), muted: overall.probability == null };
};

/** A paper in a job's list: its result for this job, expandable to a summary. */
export const JobTaskRow: React.FC<JobTaskRowProps> = ({ task, taskHref, isGithubScreening }) => {
  const [open, setOpen] = useState(false);
  const overall = overallDecision(task.result);
  const { value, muted } = rowValue(task);

  return (
    <PaperRow
      data-testid={`job-task-row-${task.paper_id}`}
      paperId={task.paper_id}
      title={task.title}
      hasFullText={false}
      value={value}
      valueMuted={muted}
      open={open}
      onToggle={() => setOpen(!open)}
    >
      <div className="flex flex-wrap items-center gap-3 pt-2 pb-2 text-sm">
        {overall && <DecisionPill value={overall.include} labels={["Include", "Exclude"]} />}
        <span className="text-slate-500">Status: {taskStatusLabel(task.status)}</span>
        <Link
          href={taskHref}
          data-testid={`job-task-open-${task.paper_id}`}
          className="ml-auto underline text-blue-600 hover:text-blue-800 font-semibold"
        >
          Open result
        </Link>
      </div>
      {task.error && <div className="text-sm text-red-700 pb-2">Error: {task.error}</div>}
      {overall?.reason && <p className="text-sm pb-2 whitespace-pre-wrap">{overall.reason}</p>}
      <PaperDetails doi={task.doi} abstract={task.abstract} isGithubScreening={isGithubScreening} />
    </PaperRow>
  );
};
