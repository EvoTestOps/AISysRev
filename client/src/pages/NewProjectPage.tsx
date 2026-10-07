import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useCallback, useState } from "react";
import { toast } from "react-toastify";
import { useLocation } from "wouter";
import { ExpandableToast } from "../components/ExpandableToast";
import { Layout } from "../components/Layout";
import { create_project } from "../services/projectService";
import { useTypedStoreActions } from "../state/store";
import { ScreeningTarget } from "../state/types";
import type { Criteria } from "../state/types/project";
import { CriteriaEditor } from "./newProject/CriteriaEditor";
import { LogicField } from "./newProject/LogicField";
import { ProjectTypeSelector } from "./newProject/ProjectTypeSelector";

type FormSectionProps = {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
};

const FormSection: React.FC<FormSectionProps> = ({ title, description, children }) => (
  <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
    <Stack spacing={2}>
      <Box>
        <Typography variant="h6" component="h2">
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" color="textSecondary">
            {description}
          </Typography>
        )}
      </Box>
      {children}
    </Stack>
  </Paper>
);

export const NewProject = () => {
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState(false);
  const [inclusionCriteria, setInclusionCriteria] = useState<string[]>([]);
  const [exclusionCriteria, setExclusionCriteria] = useState<string[]>([]);
  const [inclusionExpression, setInclusionExpression] = useState("");
  const [exclusionExpression, setExclusionExpression] = useState("");
  const [screeningTarget, setScreeningTarget] = useState<ScreeningTarget>(ScreeningTarget.PAPER);
  // Remounts the criteria editors on reset, clearing their unsaved drafts.
  const [resetKey, setResetKey] = useState(0);

  const [, navigate] = useLocation();
  const refreshProjects = useTypedStoreActions((actions) => actions.refreshProjects);

  const isGithubScreening = screeningTarget === ScreeningTarget.GITHUB_REPOSITORY;
  const itemName = isGithubScreening ? "repository" : "study";

  const handleCreate = useCallback(async () => {
    if (title.trim() === "") {
      setTitleError(true);
    } else {
      handle().catch(console.error);
    }

    async function create(): Promise<{ id: number; uuid: string }> {
      const criteria: Criteria = {
        inclusion_criteria: inclusionCriteria,
        exclusion_criteria: exclusionCriteria,
        ...(inclusionExpression.trim() ? { inclusion_expression: inclusionExpression.trim() } : {}),
        ...(exclusionExpression.trim() ? { exclusion_expression: exclusionExpression.trim() } : {}),
      };

      try {
        const res = await create_project(title, criteria, screeningTarget);
        return { id: res.id, uuid: res.uuid };
      } catch (error: any) {
        if (error.response?.data?.detail?.errors) {
          throw new Error(JSON.stringify(error.response.data.detail.errors));
        }
        if (Array.isArray(error.response?.data?.detail)) {
          const msg = (error.response.data.detail as any[]).map((e) => e.msg as string).join("\n");
          throw new Error(msg);
        }
        throw error;
      }
    }

    async function handle() {
      let uuid: string | null = null;
      try {
        const res = await create();
        uuid = res.uuid;
        toast.success("Project created successfully!");
        if (uuid) {
          refreshProjects();
          navigate(`/project/${uuid}`);
        }
      } catch (error: any) {
        const msg = typeof error?.message === "string" ? error.message : "";
        try {
          const parsed = JSON.parse(msg);
          if (Array.isArray(parsed)) {
            ExpandableToast(parsed);
          } else {
            toast.error("Project creation failed.");
          }
        } catch {
          toast.error(msg || "Project creation failed.");
        }
      }
    }
  }, [
    title,
    inclusionCriteria,
    exclusionCriteria,
    inclusionExpression,
    exclusionExpression,
    refreshProjects,
    navigate,
    screeningTarget,
  ]);

  const handleReset = useCallback(() => {
    setTitle("");
    setTitleError(false);
    setInclusionCriteria([]);
    setExclusionCriteria([]);
    setInclusionExpression("");
    setExclusionExpression("");
    setScreeningTarget(ScreeningTarget.PAPER);
    setResetKey((key) => key + 1);
  }, []);

  return (
    <Layout title="New project">
      <Stack
        spacing={3}
        sx={{ maxWidth: 840, mx: "auto" }}
        component="form"
        noValidate
        onSubmit={(e) => e.preventDefault()}
      >
        <FormSection
          title="Project type"
          description="What the project screens. This can't be changed after the project is created."
        >
          <ProjectTypeSelector value={screeningTarget} onChange={setScreeningTarget} />
        </FormSection>

        <FormSection title="Details">
          <TextField
            label="Project title"
            required
            fullWidth
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (e.target.value.trim() !== "") setTitleError(false);
            }}
            error={titleError}
            helperText={titleError ? "Give the project a title." : " "}
            slotProps={{ htmlInput: { "data-testid": "new-project-title-input" } }}
          />
        </FormSection>

        <FormSection
          title="Screening criteria"
          description={`Each criterion is evaluated for every ${itemName}. They are numbered in order (IC1, IC2… and EC1, EC2…).`}
        >
          <CriteriaEditor
            key={`inclusion_${resetKey}`}
            title="Inclusion criteria"
            description={`A ${itemName} is included when it meets these.`}
            idPrefix="IC"
            inputLabel="Add inclusion criterion"
            inputTestId="new-project-inclusion-criteria-input"
            criteria={inclusionCriteria}
            onAdd={(criterion) => setInclusionCriteria((prev) => [...prev, criterion])}
            onDelete={(index) => setInclusionCriteria((prev) => prev.filter((_, i) => i !== index))}
          />
          <Divider />
          <CriteriaEditor
            key={`exclusion_${resetKey}`}
            title="Exclusion criteria"
            description={`A ${itemName} is excluded when it meets these.`}
            idPrefix="EC"
            inputLabel="Add exclusion criterion"
            inputTestId="new-project-exclusion-criteria-input"
            criteria={exclusionCriteria}
            onAdd={(criterion) => setExclusionCriteria((prev) => [...prev, criterion])}
            onDelete={(index) => setExclusionCriteria((prev) => prev.filter((_, i) => i !== index))}
          />
        </FormSection>

        <Accordion
          variant="outlined"
          disableGutters
          sx={{ borderRadius: 2, "&::before": { display: "none" } }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 3 }}>
            <Box>
              <Typography variant="h6" component="h2">
                Per-criteria logic
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Optional. Only used by per-criterion screening tasks.
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 3, pb: 3 }}>
            <Stack spacing={2}>
              <Typography variant="body2" color="textSecondary">
                By default a {itemName} is included only if it meets <strong>all</strong> inclusion
                criteria (AND) and <strong>none</strong> of the exclusion criteria (OR), the
                standard approach for systematic reviews. To customise it, write an expression using
                AND, OR, NOT and parentheses, e.g. <code>IC1 AND (IC2 OR NOT IC3)</code>. Click a
                criterion to add it.
              </Typography>
              <LogicField
                label="Inclusion logic"
                idPrefix="IC"
                criteria={inclusionCriteria}
                value={inclusionExpression}
                onChange={setInclusionExpression}
                placeholder="e.g. IC1 AND IC2"
                defaultHelp="Empty: all inclusion criteria must be met (AND)."
              />
              <LogicField
                label="Exclusion logic"
                idPrefix="EC"
                criteria={exclusionCriteria}
                value={exclusionExpression}
                onChange={setExclusionExpression}
                placeholder="e.g. EC1 OR EC2"
                defaultHelp="Empty: meeting any exclusion criterion excludes (OR)."
              />
            </Stack>
          </AccordionDetails>
        </Accordion>

        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
          <Button onClick={handleReset} data-testid="new-project-reset-button">
            Reset
          </Button>
          <Button
            variant="contained"
            type="submit"
            onClick={handleCreate}
            data-testid="new-project-create-button"
          >
            Create project
          </Button>
        </Box>
      </Stack>
    </Layout>
  );
};
