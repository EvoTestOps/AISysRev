import classNames from "classnames";
import { CircleAlert, CircleCheck, Loader, TriangleAlert } from "lucide-react";
import { JobStatus, JobWithStats } from "../../state/types";

type JobStatusIndicatorProps = {
  job: JobWithStats;
  itemName: string;
  progress: number;
};

/** A job's progress bar and status, shown over a relative-positioned box. */
export const JobStatusIndicator: React.FC<JobStatusIndicatorProps> = ({
  job,
  itemName,
  progress,
}) => {
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
