import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import Skeleton from "react-loading-skeleton";
import { useLocation, useParams, useRoute } from "wouter";
import { ChartCandlestick } from "lucide-react";
import { AlertMessage } from "../components/AlertMessage";
import { Button } from "../components/Button";
import { FewShotModal } from "../components/FewShotModal";
import { Layout } from "../components/Layout";
import { ManualEvaluationModal } from "../components/ManualEvaluationModal";
import { PerCriteriaStatsModal } from "../components/PerCriteriaStatsModal";
import { ProjectTabs } from "../components/ProjectTabs";
import { fetchPerCriteriaStats } from "../services/resultService";
import { useTypedStoreActions, useTypedStoreState } from "../state/store";
import { JobPromptingType, PerCriteriaStatsResponse, ScreeningTarget } from "../state/types";
import { NotFoundPage } from "./NotFound";
import { CreateTaskCard } from "./project/createTask/CreateTaskCard";
import { useCreateTaskForm } from "./project/hooks/useCreateTaskForm";
import { downloadMissingFulltextRis, downloadResultCsv } from "./project/downloads";
import { JobActionModals } from "./project/JobActionModals";
import { JobCard } from "./project/JobCard";
import { ProjectActions } from "./project/ProjectActions";
import { SectionHeader } from "./project/SectionHeader";
import { UploadCard } from "./project/UploadCard";
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
  const jobs = useTypedStoreState((state) => state.jobsByProject[projectUuid] || []);
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
      fetchJobsForProject(projectUuid);
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
  const hasFiles = projectFiles.files.length > 0;
  const hasMultiplePcJobs =
    jobs.filter((job) => job.prompting_config.screening_type === JobPromptingType.PER_CRITERIA)
      .length >= 2;

  return (
    <Layout
      title={project.name}
      headerActions={
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
      }
    >
      <ProjectTabs projectUuid={projectUuid} active="tasks" itemNamePlural={itemNamePlural} />
      <div className="flex space-x-8 lg:flex-row flex-col items-start">
        <div className="flex flex-col space-y-4 w-7xl">
          {jobs.length === 0 && <AlertMessage message="No screening tasks." />}
          {jobs.map((job) => (
            <JobCard
              key={job.uuid}
              job={job}
              itemName={itemName}
              onCancel={jobActions.requestCancel}
              onDelete={jobActions.requestDelete}
            />
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <SectionHeader title={`Step 1. Upload ${itemNamePlural}`} selected={hasFiles} />
          <UploadCard
            files={projectFiles.files}
            loading={loadingProjects}
            itemNamePlural={itemNamePlural}
            onFilesSelected={projectFiles.handleFilesSelected}
          />
          <SectionHeader title="Step 2. Create task" />
          <CreateTaskCard
            form={taskForm}
            project={project}
            paperCount={papers.length}
            hasFiles={hasFiles}
            itemName={itemName}
            itemNamePlural={itemNamePlural}
            isGithubScreening={isGithubScreening}
          />
        </div>
      </div>

      <div className="fixed z-40 bottom-0 left-1/2 transform -translate-x-1/2 m-4">
        {evaluation.evaluationFinished ? (
          <Button
            variant="green"
            className="px-6 text-md font-bold rounded-xl"
            onClick={() => navigate(`/result/${projectUuid}`)}
            data-testid="show-evaluation-results-button"
          >
            Show evaluation results
          </Button>
        ) : (
          evaluation.canStart && (
            <Button
              variant="green"
              className="px-6 text-md font-bold rounded-lg "
              onClick={evaluation.open}
              data-testid="start-manual-evaluation-button"
            >
              <div className="flex flex-row gap-2">
                <ChartCandlestick />
                <span>Start manual evaluation</span>
              </div>
            </Button>
          )
        )}
      </div>
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
