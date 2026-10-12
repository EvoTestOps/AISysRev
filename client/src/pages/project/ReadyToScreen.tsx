import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { Link } from "wouter";
import { FetchedFile } from "../../state/types";
import type { Project } from "../../state/types/project";
import { TaskSetupForm } from "./createTask/TaskSetupForm";
import { CreateTaskForm } from "./hooks/useCreateTaskForm";
import { riseIn } from "../../components/motion";
import { ProjectProgress } from "./ProjectProgress";

type ReadyToScreenProps = {
  project: Project;
  form: CreateTaskForm;
  paperCount: number;
  files: FetchedFile[];
  itemName: string;
  itemNamePlural: string;
  /** Every paper already has a manual decision. */
  evaluationFinished: boolean;
  onStartManualEvaluation: () => void;
  onShowResults: () => void;
};

/**
 * What a project shows once it has papers but no screening task yet: the
 * papers are in, and setting up the first task is the one thing to do.
 */
export const ReadyToScreen: React.FC<ReadyToScreenProps> = ({
  project,
  form,
  paperCount,
  files,
  itemName,
  itemNamePlural,
  evaluationFinished,
  onStartManualEvaluation,
  onShowResults,
}) => {
  const csvNames = files.filter((f) => f.mime_type !== "application/pdf").map((f) => f.filename);
  return (
    <Box data-testid="ready-to-screen" sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 1.5,
          px: 2,
          py: 1.25,
          borderRadius: 2,
          bgcolor: "background.paper",
          border: 1,
          borderColor: (theme) => alpha(theme.palette.success.main, 0.35),
          ...riseIn(0),
        }}
      >
        <CheckCircleRoundedIcon color="success" />
        <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>
          <strong>
            {paperCount} {paperCount === 1 ? itemName : itemNamePlural} ready
          </strong>
          {csvNames.length > 0 && (
            <Box component="span" sx={{ color: "text.secondary" }}>
              {" "}
              · {csvNames.join(", ")}
            </Box>
          )}
        </Typography>
        <Button
          size="small"
          component={Link}
          href={`/project/${project.uuid}/papers/page/1`}
        >
          View {itemNamePlural}
        </Button>
      </Box>

      <Card sx={{ borderRadius: 3, overflow: "hidden", ...riseIn(1) }}>
        <ProjectProgress
          project={project}
          itemNamePlural={itemNamePlural}
          activeStep={2}
          sx={{ borderBottom: 1, borderColor: "divider", py: 2.5 }}
        />
        <Box sx={{ px: { xs: 2, md: 4 }, py: { xs: 3, md: 4 } }}>
          <Box sx={{ mb: 3, ...riseIn(2) }}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
              Set up your first screening task
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
              Choose a model to check every {itemName} against your criteria. You can run more
              tasks later to compare models.
            </Typography>
          </Box>
          <Box sx={riseIn(3)}>
            <TaskSetupForm
              form={form}
              project={project}
              paperCount={paperCount}
              itemName={itemName}
              itemNamePlural={itemNamePlural}
            />
          </Box>
        </Box>
      </Card>

      <Typography
        variant="body2"
        color="textSecondary"
        sx={{ textAlign: "center", ...riseIn(4) }}
      >
        {evaluationFinished ? (
          <>
            You've screened every {itemName} yourself.{" "}
            <Button
              size="small"
              onClick={onShowResults}
              data-testid="show-evaluation-results-button"
              sx={{ verticalAlign: "baseline" }}
            >
              Show evaluation results
            </Button>
          </>
        ) : (
          <>
            Prefer to screen them yourself?{" "}
            <Button
              size="small"
              onClick={onStartManualEvaluation}
              data-testid="start-manual-evaluation-button"
              sx={{ verticalAlign: "baseline" }}
            >
              Start manual evaluation
            </Button>
          </>
        )}
      </Typography>
    </Box>
  );
};
