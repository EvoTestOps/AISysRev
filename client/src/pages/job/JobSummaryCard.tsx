import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import { JobWithStats } from "../../state/types";
import { JobFields } from "../project/JobFields";
import { jobProgress, jobStartedAt } from "../project/jobLabels";
import { JobStatusIndicator } from "../project/JobStatusIndicator";

type JobSummaryCardProps = {
  job: JobWithStats;
  runNumber?: number;
  itemName: string;
};

/** Which model screened the papers, how, and how far it has got. */
export const JobSummaryCard: React.FC<JobSummaryCardProps> = ({ job, runNumber, itemName }) => {
  const { success, failed, total } = job.stats;
  const startedAt = jobStartedAt(job);
  return (
    <Card
      data-testid="job-summary"
      sx={{ borderRadius: 2, px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 2 }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0, flex: 1 }}>
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.5, flexWrap: "wrap" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {runNumber !== undefined ? `Run #${runNumber}` : "Screening task"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {startedAt && `Started ${startedAt} · `}
            {success} done, {failed} failed of {total}
          </Typography>
        </Box>
        <JobFields job={job} />
      </Box>
      <Box className="relative w-56 h-8" sx={{ flexShrink: 0 }}>
        <JobStatusIndicator job={job} itemName={itemName} progress={jobProgress(job)} />
      </Box>
    </Card>
  );
};
