import Tooltip from "@mui/material/Tooltip";
import classNames from "classnames";
import { CircleAlert, CircleCheck, CircleStop, Loader, TriangleAlert, XCircle } from "lucide-react";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { DropdownMenuEllipsis } from "../../components/DropDownMenus";
import {
  JobPromptingType,
  JobScreeningMode,
  JobStatus,
  JobWithStats,
  ScreeningTarget,
} from "../../state/types";

const SCREENING_TYPE_BADGES: Partial<Record<JobPromptingType, string>> = {
  [JobPromptingType.ZERO_SHOT]: "ZS",
  [JobPromptingType.FEW_SHOT]: "FS",
  [JobPromptingType.PER_CRITERIA]: "PC",
};

const screeningModeLabel = (job: JobWithStats): string => {
  switch (job.screening_mode) {
    case JobScreeningMode.TEXT:
      return job.prompting_config.screening_target === ScreeningTarget.GITHUB_REPOSITORY
        ? "GitHub"
        : "Abstract";
    case JobScreeningMode.PDF:
      return "PDF";
    case JobScreeningMode.AUTOMATIC:
      return "Automatic";
  }
};

const truncatedModelName = (name: string) =>
  name.length > 30 ? name.substring(0, 17) + "..." : name;

type JobStatusIndicatorProps = {
  job: JobWithStats;
  itemName: string;
  progress: number;
};

const JobStatusIndicator: React.FC<JobStatusIndicatorProps> = ({ job, itemName, progress }) => {
  const { success, failed, total, status } = job.stats;
  const completed = success + failed;

  if (status === JobStatus.CANCELLED) {
    return (
      <div className="absolute inset-0 flex gap-2 items-center justify-center text-xs font-semibold select-none">
        <TriangleAlert size={14} className="text-orange-600" />
        <span className="text-orange-600">
          Task Cancelled ({completed}/{total})
        </span>
      </div>
    );
  }

  return (
    <>
      {status === JobStatus.RUNNING && (
        <progress
          value={progress}
          max={100}
          className={classNames(
            "h-full w-full [&::-webkit-progress-bar]:rounded-xl [&::-webkit-progress-bar]:bg-gray-400 [&::-webkit-progress-value]:bg-blue-200 [&::-webkit-progress-value]:rounded-xl",
            {
              "[&::-webkit-progress-bar]:bg-yellow-200 [&::-webkit-progress-value]:bg-yellow-400":
                progress < 100,
              "[&::-webkit-progress-value]:bg-green-400": progress === 100,
            },
          )}
        />
      )}
      <div
        data-testid={`job-status-${job.uuid}`}
        className="absolute inset-0 flex gap-2 items-center justify-center text-xs font-semibold select-none"
      >
        {status === JobStatus.RUNNING && (
          <>
            <Loader className="animate-spin" size={16} strokeWidth={2} />
            <span>
              Screening {itemName} {completed} of {total}
            </span>
          </>
        )}
        {status === JobStatus.SUCCESS && (
          <>
            <CircleCheck size={14} className="text-green-600" />
            <span className="text-green-600">Done</span>
          </>
        )}
        {status === JobStatus.PARTIAL_SUCCESS && (
          <>
            <TriangleAlert size={14} className="text-orange-600" />
            <span className="text-orange-600">Done with errors ({failed})</span>
          </>
        )}
        {status === JobStatus.FAILED && (
          <>
            <CircleAlert size={14} className="text-red-600" />
            <span className="text-red-600">Screening failed</span>
          </>
        )}
      </div>
    </>
  );
};

type JobCardProps = {
  job: JobWithStats;
  itemName: string;
  onCancel: (jobUuid: string) => void;
  onDelete: (jobUuid: string) => void;
};

export const JobCard: React.FC<JobCardProps> = ({ job, itemName, onCancel, onDelete }) => {
  const { success, failed, total, status } = job.stats;
  const progress = total === 0 ? 0 : Math.round(((success + failed) / total) * 100);
  const badge = SCREENING_TYPE_BADGES[job.prompting_config.screening_type];

  return (
    <Card data-testid={`job-card-${job.uuid}`} className="flex-row justify-between">
      <div className="grid grid-cols-[50px_1fr_auto_auto] gap-4 w-full">
        {badge ? <Badge text={badge} invert /> : <span />}
        <div className="flex items-center gap-2 font-semibold">
          <Tooltip title={job.llm_config.model_name} enterDelay={50}>
            <span className="text-sm text-nowrap">
              {truncatedModelName(job.llm_config.model_name)}
            </span>
          </Tooltip>
          <span className="text-xs font-normal text-slate-500">{screeningModeLabel(job)}</span>
        </div>
        <div className="flex justify-end items-end w-full">
          <div className="relative w-56 h-8">
            <JobStatusIndicator job={job} itemName={itemName} progress={progress} />
          </div>
        </div>
        <div>
          <DropdownMenuEllipsis
            items={[
              {
                label: () => (
                  <div className="text-yellow-700 flex flex-row gap-3 items-center">
                    <CircleStop />
                    <span>Cancel</span>
                  </div>
                ),
                onClick: () => onCancel(job.uuid),
                disabled: progress === 100 || status === JobStatus.CANCELLED,
              },
              {
                label: () => (
                  <div className="text-red-700 flex flex-row gap-3 items-center">
                    <XCircle />
                    <span>Delete</span>
                  </div>
                ),
                onClick: () => onDelete(job.uuid),
              },
            ]}
          />
        </div>
      </div>
    </Card>
  );
};
