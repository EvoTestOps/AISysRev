import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import StopCircleOutlinedIcon from "@mui/icons-material/StopCircleOutlined";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardActions from "@mui/material/CardActions";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { Link } from "wouter";
import { JobStatus, JobWithStats } from "../../state/types";
import { JobFields } from "./JobFields";
import { jobDisplayName, jobProgress, jobStartedAt } from "./jobLabels";
import { JobStatusIndicator } from "./JobStatusIndicator";

type JobCardProps = {
  job: JobWithStats;
  /** Which run of this model in the project, e.g. 2 for Run #2. */
  runNumber?: number;
  itemName: string;
  onCancel: (jobUuid: string) => void;
  onDelete: (jobUuid: string) => void;
};

export const JobCard: React.FC<JobCardProps> = ({
  job,
  runNumber,
  itemName,
  onCancel,
  onDelete,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const { status } = job.stats;
  const progress = jobProgress(job);
  const startedAt = jobStartedAt(job);
  const taskHref = `/project/${job.project_uuid}/job/${job.uuid}`;
  const closeMenu = () => setMenuAnchor(null);
  // Only running or queued tasks can be cancelled.
  const canCancel = progress < 100 && status !== JobStatus.CANCELLED;

  return (
    <Card
      data-testid={`job-card-${job.uuid}`}
      // Rounded like the other cards on the page (rounded-lg).
      sx={{ display: "flex", alignItems: "center", borderRadius: 2 }}
    >
      <CardActionArea
        component={Link}
        href={taskHref}
        data-testid={`job-card-link-${job.uuid}`}
        aria-label={`View ${jobDisplayName(job, runNumber)}`}
        sx={{ display: "flex", justifyContent: "flex-start", gap: 2, px: 2, py: 1.5 }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0, flex: 1 }}>
          <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.5 }}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 600 }}
              data-testid={`job-card-run-${job.uuid}`}
            >
              {runNumber !== undefined ? `Run #${runNumber}` : "Screening task"}
            </Typography>
            {startedAt && (
              <Typography variant="caption" color="textSecondary">
                Started {startedAt}
              </Typography>
            )}
          </Box>
          <JobFields job={job} />
        </Box>
        <Box className="relative w-56 h-8" sx={{ flexShrink: 0 }}>
          <JobStatusIndicator job={job} itemName={itemName} progress={progress} />
        </Box>
      </CardActionArea>
      <CardActions sx={{ flexShrink: 0 }}>
        <IconButton
          aria-label="Task actions"
          data-testid={`job-card-menu-${job.uuid}`}
          onClick={(e) => setMenuAnchor(e.currentTarget)}
        >
          <MoreHorizIcon />
        </IconButton>
        <Menu
          anchorEl={menuAnchor}
          open={menuAnchor !== null}
          onClose={closeMenu}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
        >
          {canCancel && (
            <MenuItem
              onClick={() => {
                closeMenu();
                onCancel(job.uuid);
              }}
            >
              <ListItemIcon>
                <StopCircleOutlinedIcon fontSize="small" color="warning" />
              </ListItemIcon>
              <ListItemText>Cancel</ListItemText>
            </MenuItem>
          )}
          <MenuItem
            onClick={() => {
              closeMenu();
              onDelete(job.uuid);
            }}
          >
            <ListItemIcon>
              <DeleteOutlinedIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        </Menu>
      </CardActions>
    </Card>
  );
};
