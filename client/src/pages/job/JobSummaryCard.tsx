import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { JobWithStats } from "../../state/types";
import { jobProgress, SCREENING_TYPE_BADGES, screeningModeLabel } from "../project/jobLabels";
import { JobStatusIndicator } from "../project/JobStatusIndicator";

type JobSummaryCardProps = {
  job: JobWithStats;
  itemName: string;
};

/** Which model screened the papers, how, and how far it has got. */
export const JobSummaryCard: React.FC<JobSummaryCardProps> = ({ job, itemName }) => {
  const badge = SCREENING_TYPE_BADGES[job.prompting_config.screening_type];
  const { success, failed, total } = job.stats;
  return (
    <Card className="flex-row items-center gap-4" data-testid="job-summary">
      {badge && <Badge text={badge} invert />}
      <div className="flex flex-col">
        <span className="font-semibold">{job.llm_config.model_name}</span>
        <span className="text-xs text-slate-500">
          {job.llm_config.provider_name} · {screeningModeLabel(job)} · {success} done, {failed}{" "}
          failed of {total}
        </span>
      </div>
      <div className="relative w-56 h-8 ml-auto">
        <JobStatusIndicator job={job} itemName={itemName} progress={jobProgress(job)} />
      </div>
    </Card>
  );
};
