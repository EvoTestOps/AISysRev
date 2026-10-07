import Box, { BoxProps } from "@mui/material/Box";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import type { Project } from "../../state/types/project";

type ProjectProgressProps = {
  project: Project;
  itemNamePlural: string;
  /** 1: upload, 2: run a screening task. */
  activeStep: 1 | 2;
  sx?: BoxProps["sx"];
};

/** Where a new project is on its way from creation to results, as a stepper. */
export const ProjectProgress: React.FC<ProjectProgressProps> = ({
  project,
  itemNamePlural,
  activeStep,
  sx,
}) => {
  const { inclusion_criteria, exclusion_criteria } = project.criteria;
  const steps = [
    {
      label: "Create project",
      caption: `${inclusion_criteria.length} inclusion, ${exclusion_criteria.length} exclusion ${
        exclusion_criteria.length === 1 ? "criterion" : "criteria"
      }`,
    },
    { label: `Upload ${itemNamePlural}`, caption: "A CSV file" },
    { label: "Run a screening task", caption: "An LLM checks the criteria" },
    { label: "Review results", caption: "Compare with your own decisions" },
  ];
  return (
    <Box
      sx={[
        {
          px: { xs: 2, md: 6 },
          py: 3,
          bgcolor: (theme) => alpha(theme.palette.grey[50], 0.6),
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Typography
        variant="overline"
        color="textSecondary"
        sx={{ display: "block", textAlign: "center", mb: 2 }}
      >
        Your progress
      </Typography>
      <Stepper activeStep={activeStep} alternativeLabel>
        {steps.map(({ label, caption }) => (
          <Step key={label}>
            <StepLabel
              optional={
                <Typography
                  variant="caption"
                  color="textSecondary"
                  sx={{ display: { xs: "none", sm: "block" } }}
                >
                  {caption}
                </Typography>
              }
            >
              {label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
};
