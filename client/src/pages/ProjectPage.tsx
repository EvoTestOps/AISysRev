import AddIcon from "@mui/icons-material/Add";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Fade from "@mui/material/Fade";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import Skeleton from "react-loading-skeleton";
import { useLocation, useParams, useRoute } from "wouter";
import { FewShotModal } from "../components/FewShotModal";
import { Layout } from "../components/Layout";
import { PROJECTS_PARENT } from "../components/PageHeader";
import { ManualEvaluationModal } from "../components/ManualEvaluationModal";
import { PerCriteriaStatsModal } from "../components/PerCriteriaStatsModal";
import { ProjectTabs } from "../components/ProjectTabs";
import { fetchPerCriteriaStats } from "../services/resultService";
import { useTypedStoreActions, useTypedStoreState } from "../state/store";
import { JobPromptingType, PerCriteriaStatsResponse, ScreeningTarget } from "../state/types";
import { NotFoundPage } from "./NotFound";
import { useCreateTaskForm } from "./project/hooks/useCreateTaskForm";
import { downloadMissingFulltextRis, downloadResultCsv } from "./project/downloads";
import { JobActionModals } from "./project/JobActionModals";
import { JobCard } from "./project/JobCard";
import { jobRunNumbers, newestFirst } from "./project/jobLabels";
import { ProjectActions } from "./project/ProjectActions";
import { NewTaskDialog } from "./project/NewTaskDialog";
import { ProjectWelcome } from "./project/ProjectWelcome";
import { ReadyToScreen } from "./project/ReadyToScreen";
import { useFulltextImport } from "./project/hooks/useFulltextImport";
import { useJobActions } from "./project/hooks/useJobActions";
import { useManualEvaluation } from "./project/hooks/useManualEvaluation";
import { useProjectFiles } from "./project/hooks/useProjectFiles";

export const ProjectPage = () => {
  const { projectUuid } = useParams<{ projectUuid: string }>();
  const [, navigate] = useLocation();
  const [fewShotViewMatch] = useRoute("/project/:projectUuid/few_shot");

  const loadingProjects = useTypedStoreState((state) => state.loading.projects);
  const loadProjects = useTypedStoreActions((actions) => actions.fetchProjects);
  const project = useTypedStoreState((state) => state.getProjectByUuid)(projectUuid);
  const papers = useTypedStoreState((state) => state.getPapersForProject)(projectUuid);
  const fetchPapers = useTypedStoreActions((actions) => actions.fetchPapers);
  // Whether the papers have been fetched at least once (or failed to be), so an
  // empty list means the project really has none.
  const papersKnown = useTypedStoreState(
    (state) =>
      state.papers[projectUuid] !== undefined || state.loading.papers[projectUuid] === false,
  );
  const jobsLoaded = useTypedStoreState((state) => state.jobsByProject[projectUuid] !== undefined);
  const jobs = useTypedStoreState((state) => state.jobsByProject[projectUuid] || []);
  // Set when fetching the jobs failed, so the page doesn't wait for them forever.
  const [jobsFailed, setJobsFailed] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const runNumbers = useMemo(() => jobRunNumbers(jobs), [jobs]);
  const fetchJobsForProject = useTypedStoreActions((actions) => actions.fetchJobsForProject);

  const screeningTarget = project?.screening_target ?? ScreeningTarget.PAPER;
  const isGithubScreening = screeningTarget === ScreeningTarget.GITHUB_REPOSITORY;
  const itemName = isGithubScreening ? "repository" : "paper";
  const itemNamePlural = isGithubScreening ? "repositories" : "papers";

  useEffect(() => {
    if (project !== undefined) {
      fetchPapers(projectUuid);
    }
  }, [project, projectUuid, fetchPapers]);

  useEffect(() => {
    if (projectUuid) {
      fetchJobsForProject(projectUuid).catch((e: unknown) => {
        console.error("Error fetching jobs:", e);
        setJobsFailed(true);
      });
    }
  }, [projectUuid, fetchJobsForProject]);

  const taskForm = useCreateTaskForm(projectUuid, screeningTarget);
  const projectFiles = useProjectFiles(projectUuid, screeningTarget);
  const fulltextImport = useFulltextImport({
    projectUuid,
    onImported: async () => {
      await fetchPapers(projectUuid);
      await projectFiles.fetchFiles();
    },
    notify: toast,
  });
  const jobActions = useJobActions(projectUuid);
  const evaluation = useManualEvaluation({ projectUuid, papers, jobs, itemNamePlural });

  const [perCriteriaStats, setPerCriteriaStats] = useState<PerCriteriaStatsResponse | null>(null);
  // TODO: Use redux
  const showPerCriteriaStats = useCallback(async () => {
    try {
      setPerCriteriaStats(await fetchPerCriteriaStats(projectUuid));
    } catch (e) {
      console.error("Error fetching agreement stats:", e);
      toast.error("Failed to load agreement statistics.");
    }
  }, [projectUuid]);

  if (loadingProjects) {
    return (
      <Layout title="">
        <Skeleton />
      </Layout>
    );
  }

  if (!project) {
    return <NotFoundPage />;
  }

  const hasPapers = papers.length > 0;

  // Hold back the page until the papers and tasks are known, so it doesn't
  // flash one layout and then swap to another.
  if (!papersKnown || !(jobsLoaded || jobsFailed)) {
    return <Layout title={project.name} parent={PROJECTS_PARENT} />;
  }

  if (!hasPapers) {
    return (
      <Layout title={project.name} parent={PROJECTS_PARENT}>
        <ProjectWelcome
          project={project}
          itemNamePlural={itemNamePlural}
          uploading={projectFiles.uploading}
          onFilesSelected={projectFiles.handleFilesSelected}
        />
      </Layout>
    );
  }

  const hasMultiplePcJobs =
    jobs.filter((job) => job.prompting_config.screening_type === JobPromptingType.PER_CRITERIA)
      .length >= 2;

  const formProps = {
    form: taskForm,
    project,
    paperCount: papers.length,
    itemName,
    itemNamePlural,
    isGithubScreening,
  };
  const hasTasks = jobs.length > 0;

  return (
    <Layout
      title={project.name}
      parent={PROJECTS_PARENT}
      headerActions={
        <>
          {hasTasks && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setNewTaskOpen(true)}
              data-testid="new-task-button"
            >
              New task
            </Button>
          )}
          <ProjectActions
            hasPapers={hasPapers}
            downloadCsv={() => downloadResultCsv(projectUuid, screeningTarget)}
            downloadMissingFulltextRis={() => downloadMissingFulltextRis(projectUuid)}
            onImportFulltext={fulltextImport.trigger}
            importingFulltext={fulltextImport.importing}
            projectUuid={projectUuid}
            onPerCriteriaStats={showPerCriteriaStats}
            hasMultiplePcJobs={hasMultiplePcJobs}
            screeningTarget={screeningTarget}
          />
        </>
      }
    >
      <Fade in appear timeout={400}>
        <div>
          <ProjectTabs projectUuid={projectUuid} active="tasks" itemNamePlural={itemNamePlural} />
          {hasTasks ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {newestFirst(jobs).map((job) => (
                <JobCard
                  runNumber={runNumbers[job.uuid]}
                  key={job.uuid}
                  job={job}
                  itemName={itemName}
                  onCancel={jobActions.requestCancel}
                  onDelete={jobActions.requestDelete}
                />
              ))}
            </Box>
          ) : (
            <ReadyToScreen
              {...formProps}
              files={projectFiles.files}
              evaluationFinished={evaluation.evaluationFinished}
              onStartManualEvaluation={evaluation.open}
              onShowResults={() => navigate(`/result/${projectUuid}`)}
            />
          )}
        </div>
      </Fade>

      {hasTasks && (
        <Box
          sx={{
            position: "fixed",
            zIndex: 40,
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          {evaluation.evaluationFinished ? (
            <Button
              variant="contained"
              color="success"
              size="large"
              startIcon={<AssessmentOutlinedIcon />}
              onClick={() => navigate(`/result/${projectUuid}`)}
              data-testid="show-evaluation-results-button"
              sx={{ borderRadius: 6, px: 3, boxShadow: 6 }}
            >
              Show evaluation results
            </Button>
          ) : (
            evaluation.canStart && (
              <Button
                variant="contained"
                color="success"
                size="large"
                startIcon={<FactCheckOutlinedIcon />}
                onClick={evaluation.open}
                data-testid="start-manual-evaluation-button"
                sx={{ borderRadius: 6, px: 3, boxShadow: 6 }}
              >
                Start manual evaluation
              </Button>
            )
          )}
        </Box>
      )}
      <NewTaskDialog
        open={newTaskOpen}
        onClose={() => setNewTaskOpen(false)}
        {...formProps}
      />
      {fewShotViewMatch && (
        <FewShotModal
          llmConfig={{
            provider_name: taskForm.selectedProvider!.value,
            model_name: taskForm.selectedModel!.value,
            model_parameters: taskForm.modelFormValues,
            provider_parameters: {},
          }}
          screeningMode={taskForm.screeningMode}
          screeningTarget={screeningTarget}
          onClose={() => {
            loadProjects();
            fetchJobsForProject(projectUuid);
            navigate(`/project/${projectUuid}`);
          }}
        />
      )}
      {evaluation.isOpen && evaluation.paperUuid && (
        <ManualEvaluationModal
          key={evaluation.paperUuid}
          currentTaskUuid={evaluation.currentTaskUuid}
          inclusionCriteria={project.criteria.inclusion_criteria}
          exclusionCriteria={project.criteria.exclusion_criteria}
          papers={papers}
          paperUuid={evaluation.paperUuid}
          screeningTarget={screeningTarget}
          onEvaluated={evaluation.next}
          onClose={evaluation.close}
        />
      )}
      {perCriteriaStats && (
        <PerCriteriaStatsModal
          open={true}
          onClose={() => setPerCriteriaStats(null)}
          data={perCriteriaStats}
        />
      )}
      <JobActionModals actions={jobActions} />
      <input
        type="file"
        data-testid="fulltext-import-folder-input"
        ref={fulltextImport.inputProps.ref}
        multiple
        onChange={fulltextImport.inputProps.onChange}
        className="hidden"
      />
    </Layout>
  );
};
