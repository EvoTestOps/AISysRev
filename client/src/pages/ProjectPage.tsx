import { useParams, useRoute, useLocation, useSearch, Link } from "wouter";
import { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import { Layout } from "../components/Layout";
import { H5, H6 } from "../components/Typography";
import { DropdownMenuText, DropdownOption } from "../components/DropDownMenus";
import { FileDropArea } from "../components/FileDropArea";
import { ExpandableToast } from "../components/ExpandableToast";
import { TruncatedFileNames } from "../components/TruncatedFileNames";
import {
  fetchJobTasksFromBackend,
  fetchPapersFromBackend,
} from "../services/jobTaskService";
import { createJob, fetchJobsForProject } from "../services/jobService";
import {
  fileUploadToBackend,
  fileFetchFromBackend,
} from "../services/fileService";
import { ManualEvaluationModal } from "../components/ManualEvaluationModal";
import { ModelResponse, retrieve_models } from "../services/openRouterService";
import { Button } from "../components/Button";
import {
  FetchedFile,
  JobTask,
  JobTaskStatus,
  Paper,
  CreatedJob,
  LlmConfig,
  createZeroShotPromptingConfig,
  JobPromptingType,
} from "../state/types";
import axios from "axios";
import Tooltip from "@mui/material/Tooltip";
import { useConfig } from "../config/config";
import { twMerge } from "tailwind-merge";
import {
  ChartCandlestick,
  CircleAlert,
  CircleCheck,
  Download,
  FileText,
  Loader,
  Sparkles,
  Square,
  SquareCheckBig,
} from "lucide-react";
import { Card } from "../components/Card";
import { TabButton } from "../components/TabButton";
import { useTypedStoreActions, useTypedStoreState } from "../state/store";
import Skeleton from "react-loading-skeleton";
import { NotFoundPage } from "./NotFound";
import { Hr } from "../components/Hr";
import { AlertMessage } from "../components/AlertMessage";
import { LinkButton } from "../components/LinkButton";
import { FewShotModal } from "../components/FewShotModal";
import classNames from "classnames";
import { Badge } from "../components/Badge";

type ActionComponentProps = {
  hasPapers: boolean;
  projectUuid: string;
  downloadCsv: () => unknown;
};

const ActionComponent: React.FC<ActionComponentProps> = ({
  hasPapers,
  projectUuid,
  downloadCsv,
}) => {
  return (
    <div className="flex flex-row gap-2">
      <Button
        variant="slate"
        onClick={downloadCsv}
        title="Download CSV"
        disabled={!hasPapers}
      >
        <Download />
        <span>Download CSV</span>
      </Button>
      {hasPapers && (
        <a
          className={twMerge(
            "px-4 py-2 text-white flex flex-row gap-2 items-center content-center text-sm font-semibold rounded-lg shadow-md transition duration-200 ease-in-out cursor-pointer bg-slate-800 hover:bg-slate-700"
          )}
          href={`/api/v1/result/html?${new URLSearchParams({
            project_uuid: projectUuid,
          }).toString()}`}
          target="__blank"
          rel="noopener noreferrer"
          title="Show HTML"
        >
          <FileText />
          <span>Show HTML</span>
        </a>
      )}
    </div>
  );
};

const SectionHeader: React.FC<{
  title: string;
  disabled?: boolean;
  selected?: boolean;
}> = ({ title, selected, disabled = false }) => (
  <div
    className={twMerge(
      classNames(
        "h-16 grid grid-cols-[1fr_30px] items-center content-center p-4 bg-slate-800 text-white rounded-lg",
        {
          "bg-gray-700 opacity-45": disabled,
        }
      )
    )}
  >
    <H6 className="select-none">{title}</H6>
    <span>
      {selected === false && <Square size={20} strokeWidth={3} />}
      {selected === true && (
        <SquareCheckBig size={20} strokeWidth={3} className="text-green-500" />
      )}
    </span>
  </div>
);

export const ProjectPage = () => {
  const params = useParams<{ projectUuid: string }>();
  const { projectUuid } = params;
  const [, navigate] = useLocation();
  const [evaluateViewMatch] = useRoute("/project/:projectUuid/evaluate");
  const [fewShotViewMatch] = useRoute("/project/:projectUuid/few_shot");
  const search = useSearch();
  const jobTaskRefetchIntervalMs = 5000;
  const [temperature, setTemperature] = useState(0);
  const [seed, setSeed] = useState(128);
  const [top_p, setTop_p] = useState(0.1);
  const [isLlmSelected, setIsLlmSelected] = useState(true);
  const [papersLoading, setPapersLoading] = useState(false);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [createdJobs, setCreatedJobs] = useState<CreatedJob[]>([]);
  const [fetchedFiles, setFetchedFiles] = useState<FetchedFile[]>([]);
  const [jobTasks, setJobTasks] = useState<JobTask[]>([]);

  const loadingProjects = useTypedStoreState((state) => state.loading.projects);
  const loadProjects = useTypedStoreActions((actions) => actions.fetchProjects);
  const getProjectByUuid = useTypedStoreState(
    (state) => state.getProjectByUuid
  );
  const fetchPapers = useTypedStoreActions((actions) => actions.fetchPapers);

  const project = getProjectByUuid(projectUuid);

  useEffect(() => {
    if (project !== undefined) {
      fetchPapers(projectUuid);
    }
  }, [fetchPapers, project, projectUuid]);

  const { loading: openrouterKeyLoading, setting: openrouterKey } =
    useConfig("openrouter_api_key");

  const paperUuid = useMemo(() => {
    if (!search) return null;
    return new URLSearchParams(search).get("paperUuid");
  }, [search]);
  const [availableModels, setAvailableModels] = useState<ModelResponse["data"]>(
    []
  );
  const [selectedLlm, setSelectedLlm] = useState<DropdownOption | undefined>(
    undefined
  );

  const pendingTasks = useMemo(
    () => papers.filter((paper) => paper.human_result == null),
    [papers]
  );

  const evaluationFinished = jobTasks.length > 0 && pendingTasks.length === 0;

  const fetchJobs = useCallback(() => {
    async function doFetch() {
      try {
        const jobs = await fetchJobsForProject(projectUuid);
        setCreatedJobs(jobs);
      } catch (e) {
        console.error("Failed to fetch jobs for project", e);
      }
    }
    doFetch().catch(console.error);
  }, [projectUuid]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs, projectUuid]);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const models = await retrieve_models();
        setAvailableModels(models);
      } catch (error) {
        console.error("Failed to fetch models", error);
      }
    };
    fetchModels();
  }, []);

  const paperToTaskMap = useMemo(() => {
    if (
      papers.length === 0 ||
      jobTasks.length === 0 ||
      pendingTasks.length === 0
    ) {
      return {};
    }

    const byDoi: Record<string, string> = {};
    pendingTasks.forEach((task) => {
      if (task.doi && !byDoi[task.doi]) {
        byDoi[task.doi] = task.uuid;
      }
    });

    const map: Record<string, string> = {};
    papers.forEach((paper, idx) => {
      if (paper.doi && byDoi[paper.doi]) {
        map[paper.uuid] = byDoi[paper.doi];
      } else if (pendingTasks[idx]) {
        map[paper.uuid] = pendingTasks[idx].uuid;
      }
    });
    return map;
  }, [papers, jobTasks, pendingTasks]);

  const currentTaskUuid = paperUuid ? paperToTaskMap[paperUuid] : undefined;

  const loadPapers = useCallback(async () => {
    setPapersLoading(true);
    try {
      const fetched = await fetchPapersFromBackend(projectUuid);
      // console.log("Fetched papers", fetched);
      setPapers(fetched);
    } catch (e) {
      console.error("Failed to fetch papers", e);
    } finally {
      setPapersLoading(false);
    }
  }, [projectUuid]);

  useEffect(() => {
    loadPapers();
  }, [loadPapers]);

  const createZeroShotJob = useCallback(async () => {
    if (!selectedLlm) {
      toast.error("Please select a llm model before creating a task.");
      setIsLlmSelected(false);
      return;
    }
    const llmConfig: LlmConfig = {
      model_name: selectedLlm.value,
      temperature: temperature,
      seed: seed,
      top_p: top_p,
    };

    const promptingConfig = createZeroShotPromptingConfig();

    try {
      const res = await createJob(projectUuid, llmConfig, promptingConfig);
      const createdJob: CreatedJob = {
        uuid: res.uuid,
        project_uuid: res.project_uuid,
        llm_config: res.llm_config,
        prompting_config: res.prompting_config,
        created_at: res.created_at,
        updated_at: res.updated_at,
      };
      setCreatedJobs((prev) => [...prev, createdJob]);
      await loadPapers();
    } catch (e) {
      console.error("Error creating job:", e);
      toast.error("Error creating job");
    }
  }, [projectUuid, selectedLlm, temperature, seed, top_p, loadPapers]);

  const uploadFilesToBackend = useCallback(
    async (files: File[]) => {
      try {
        const res = await fileUploadToBackend(files, projectUuid);
        if (res.valid_filenames?.length) {
          toast.success(`${res.valid_filenames.length} file(s) uploaded`);
        }
        if (res.errors?.length) {
          ExpandableToast(res.errors);
          console.error("File upload errors:", res.errors);
        }
      } catch (e) {
        if (axios.isAxiosError(e)) {
          toast.error("File upload failed: " + e.response?.data.detail);
        } else {
          toast.error("File upload failed due to unknown error");
        }
        console.error("File upload error:", e);
        throw e;
      }
    },
    [projectUuid]
  );

  const fetchFiles = useCallback(async () => {
    try {
      const files = await fileFetchFromBackend(projectUuid);
      setFetchedFiles(files);
    } catch (e) {
      toast.warn("Fetching file(s) failed.");
      console.error("File fetch error:", e);
      throw e;
    }
  }, [projectUuid]);

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      try {
        await uploadFilesToBackend(files);
        await fetchFiles();
        await loadPapers();
      } catch (error) {
        console.error("Problem uploading the files", error);
      }
    },
    [uploadFilesToBackend, fetchFiles, loadPapers]
  );

  useEffect(() => {
    (async () => {
      try {
        await fetchFiles();
      } catch (e) {
        console.error("Problem fetching the files", e);
      }
    })();
  }, [fetchFiles]);

  useEffect(() => {
    if (createdJobs.length === 0) return;

    const fetchAll = () => {
      Promise.all(
        createdJobs.map((job) => {
          // console.log("job.uuid", job.uuid);
          // @ts-expect-error Expected
          return fetchJobTasksFromBackend(job.uuid, job.id);
        })
      )
        .then((results) => {
          setJobTasks(results.flat());
          // console.log("results: ", results.flat());
        })
        .catch((error) => {
          console.error("Error fetching job tasks:", error);
        });
    };

    fetchAll();
    const interval = setInterval(fetchAll, jobTaskRefetchIntervalMs);
    return () => clearInterval(interval);
  }, [createdJobs, jobTaskRefetchIntervalMs]);

  const openManualEvaluation = useCallback(() => {
    if (evaluationFinished) return;
    if (papers.length === 0) {
      toast.warn("No papers available.");
      return;
    }
    const firstWithTask = papers.find((paper) => paperToTaskMap[paper.uuid]);
    const target = firstWithTask || papers[0];
    if (!target) return;
    navigate(`/project/${projectUuid}/evaluate?paperUuid=${target.uuid}`);
  }, [papers, paperToTaskMap, navigate, projectUuid, evaluationFinished]);

  const nextPaper = useCallback(async () => {
    if (!paperUuid) return;
    const idx = papers.findIndex((paper) => paper.uuid === paperUuid);
    if (idx !== -1) {
      for (let i = idx + 1; i < papers.length; i++) {
        const candidate = papers[i];
        if (jobTasks.length === 0 || paperToTaskMap[candidate.uuid]) {
          navigate(
            `/project/${projectUuid}/evaluate?paperUuid=${candidate.uuid}`
          );
          return;
        }
      }
    }
    await loadPapers();
    navigate(`/project/${projectUuid}`);
    toast.success("Manual evaluation finished.");
  }, [
    paperUuid,
    papers,
    jobTasks.length,
    paperToTaskMap,
    navigate,
    projectUuid,
    loadPapers,
  ]);

  useEffect(() => {
    if (evaluateViewMatch && !paperUuid && papers.length > 0) {
      const first =
        papers.find((paper) => paperToTaskMap[paper.uuid]) || papers[0];
      navigate(`/project/${projectUuid}/evaluate?paperUuid=${first.uuid}`, {
        replace: true,
      });
    }
  }, [
    evaluateViewMatch,
    paperUuid,
    papers,
    paperToTaskMap,
    navigate,
    projectUuid,
  ]);

  const canStartManualEvaluation = papers.length > 0;

  const showEvaluationResults = useCallback(() => {
    if (!evaluationFinished) return;
    navigate(`/result/${projectUuid}`);
  }, [evaluationFinished, navigate, projectUuid]);

  const downloadCsv = useCallback(() => {
    async function dl() {
      if (!projectUuid) return;
      const response = await fetch(
        `/api/v1/result/download_result_csv?${new URLSearchParams({
          project_uuid: projectUuid,
        }).toString()}`
      );
      if (!response.ok) {
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `project_${projectUuid}_results.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    }
    dl().catch(console.error);
  }, [projectUuid]);

  const hasPapers = papers && papers.length > 0;

  if (!project) {
    return <NotFoundPage />;
  }

  const inclusionCriteria = project?.criteria.inclusion_criteria;
  const exclusionCriteria = project?.criteria.exclusion_criteria;

  return (
    <Layout
      title={project?.name || ""}
      navbarActionComponent={() => (
        <ActionComponent
          hasPapers={hasPapers}
          downloadCsv={downloadCsv}
          projectUuid={projectUuid}
        />
      )}
    >
      <div className="flex flex-row mb-4">
        <TabButton href={`/project/${projectUuid}`} active>
          Screening tasks
        </TabButton>
        <TabButton href={`/project/${projectUuid}/papers/page/1`}>
          List of papers
        </TabButton>
      </div>
      <div className="flex space-x-8 lg:flex-row flex-col items-start">
        <div className="flex flex-col space-y-4 w-7xl">
          {/* <Card>
            <H6>Inclusion criteria</H6>
            {loadingProjects ? (
              <Skeleton />
            ) : (
              <CriteriaList criteria={inclusionCriteria || []} />
            )}
            <H6>Exclusion criteria</H6>
            {loadingProjects ? (
              <Skeleton />
            ) : (
              <CriteriaList criteria={exclusionCriteria || []} />
            )}
          </Card> */}
          {/* 
          <H4>Screening tasks</H4> */}
          {jobTasks.length === 0 && (
            <AlertMessage message="No screening tasks." />
          )}
          {createdJobs.map((job) => {
            const tasks = jobTasks.filter((task) => task.job_uuid === job.uuid);
            const doneCount = tasks.filter(
              (task) => task.status === JobTaskStatus.DONE
            ).length;
            const totalCount = tasks.length;
            const progress =
              totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);
            // console.log(job.prompting_config);
            return (
              <Card key={job.uuid} className="flex-row justify-between">
                <div className="grid grid-cols-[50px_1fr_auto] gap-4 w-full">
                  <>
                    {job.prompting_config.screening_type ==
                      JobPromptingType.ZERO_SHOT && <Badge text="ZS" invert />}
                    {job.prompting_config.screening_type ==
                      JobPromptingType.FEW_SHOT && <Badge text="FS" invert />}
                  </>
                  <div className="flex items-center font-semibold">
                    <Tooltip title={job.llm_config.model_name} enterDelay={50}>
                      <span className="text-sm text-nowrap">
                        {job.llm_config.model_name.length > 30
                          ? job.llm_config.model_name.substring(0, 17) + "..."
                          : job.llm_config.model_name}
                      </span>
                    </Tooltip>
                  </div>
                  <div className="flex justify-end items-end w-full">
                    <div className="relative w-56 h-8">
                      {progress !== 100 && (
                        <progress
                          value={progress}
                          max={100}
                          className={classNames(
                            "h-full w-full [&::-webkit-progress-bar]:rounded-xl [&::-webkit-progress-bar]:bg-gray-400 [&::-webkit-progress-value]:bg-blue-200 [&::-webkit-progress-value]:rounded-xl",
                            {
                              "[&::-webkit-progress-bar]:bg-yellow-200 [&::-webkit-progress-value]:bg-yellow-400":
                                progress < 100,
                              "[&::-webkit-progress-value]:bg-green-400":
                                progress === 100,
                            }
                          )}
                        />
                      )}
                      <div className="absolute inset-0 flex gap-2 items-center justify-center text-xs font-semibold select-none">
                        {progress < 100 && (
                          <>
                            <Loader
                              className="animate-spin"
                              size={16}
                              strokeWidth={2}
                            />
                            <span>
                              Screening paper {doneCount} of {totalCount}
                            </span>
                          </>
                        )}
                        {progress === 100 && (
                          <>
                            <CircleCheck size={14} className="text-green-600" />
                            <span className="text-green-600">Done</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
        <div className="flex flex-col gap-2">
          <SectionHeader
            title="Step 1. Upload papers"
            selected={fetchedFiles.length !== 0}
          />
          <Card>
            {fetchedFiles.length == 0 && (
              <div>
                <FileDropArea onFilesSelected={handleFilesSelected} />
              </div>
            )}
            {loadingProjects ? (
              <Skeleton />
            ) : (
              <TruncatedFileNames files={fetchedFiles} maxLength={25} />
            )}
          </Card>
          <SectionHeader title="Step 2. Create task" />
          <Card className="relative">
            {fetchedFiles.length === 0 && (
              <div className="absolute select-none z-50 top-0 p-8 left-0 bg-gray-700 opacity-90 w-full h-full rounded-md flex items-center text-center text-white">
                <CircleAlert strokeWidth={2} />
                <span>To create tasks, you must first upload papers.</span>
              </div>
            )}
            <>
              <div className="flex">
                <H5 className="pr-16">LLM</H5>
                <DropdownMenuText
                  disabled={openrouterKey == null || fetchedFiles.length === 0}
                  options={availableModels.map((m) => ({
                    name: m.name,
                    value: m.id,
                  }))}
                  selected={selectedLlm}
                  onSelect={setSelectedLlm}
                  isLlmSelected={isLlmSelected}
                  setIsLlmSelected={setIsLlmSelected}
                />
              </div>
              {!openrouterKeyLoading && openrouterKey == null && (
                <div>
                  <div
                    className="flex bg-red-300 rounded-md p-4 items-center"
                    data-testid="error-missing-openrouter-api-key"
                  >
                    <span className="font-bold text-sm text-red-900 select-none">
                      OpenRouter API key is not set
                      <br />
                      <Link className="text-blue-800" to="/settings">
                        Go to settings
                      </Link>
                    </span>
                  </div>
                </div>
              )}
              <Hr />
              <p className="text-md font-bold">LLM configuration</p>
              <div className="flex justify-between">
                <p className="text-md font-semibold">
                  Temperature ({temperature})
                </p>
                <input
                  type="range"
                  className="pl-2 cursor-pointer disabled:cursor-not-allowed bg-gray-200 accent-slate-800"
                  data-testid="temperature-input"
                  min={0}
                  max={1}
                  step={0.1}
                  value={temperature}
                  disabled={
                    openrouterKey == null ||
                    fetchedFiles.length === 0 ||
                    selectedLlm === undefined
                  }
                  onChange={(e) => setTemperature(e.target.valueAsNumber)}
                />
              </div>
              <div className="flex justify-between items-center">
                <p className="text-md font-semibold">Seed</p>
                <input
                  type="number"
                  className="p-1 rounded-xl text-center border-gray-300 border-2 not-disabled:hover:bg-gray-100 cursor-pointer disabled:cursor-not-allowed"
                  data-testid="seed-input"
                  value={seed}
                  disabled={
                    openrouterKey == null ||
                    fetchedFiles.length === 0 ||
                    selectedLlm === undefined
                  }
                  onChange={(e) => setSeed(e.target.valueAsNumber)}
                />
              </div>
              <div className="flex justify-between items-center">
                <p className="text-md font-semibold">top_p ({top_p})</p>
                <input
                  type="range"
                  className="pl-2 cursor-pointer disabled:cursor-not-allowed bg-gray-200 accent-slate-800"
                  data-testid="top_p-input"
                  min={0.1}
                  max={1}
                  step={0.1}
                  value={top_p}
                  disabled={
                    openrouterKey == null ||
                    fetchedFiles.length === 0 ||
                    selectedLlm === undefined
                  }
                  onChange={(e) => setTop_p(e.target.valueAsNumber)}
                />
              </div>
              <Hr />
              <div className="flex justify-start">
                <Button
                  variant="purple"
                  onClick={() => createZeroShotJob()}
                  disabled={
                    openrouterKey == null ||
                    fetchedFiles.length === 0 ||
                    selectedLlm === undefined
                  }
                  title="Create zero-shot task"
                  className="w-full rounded-lg font-bold text-sm items-center justify-center"
                >
                  <Sparkles />
                  <Badge text="ZS" />
                  <span>Create Zero-shot</span>
                </Button>
              </div>
              <div className="flex justify-start">
                <LinkButton
                  href={`/project/${projectUuid}/few_shot`}
                  variant="purple"
                  disabled={
                    openrouterKey == null ||
                    fetchedFiles.length === 0 ||
                    selectedLlm === undefined
                  }
                  title="Create few-shot task"
                  className="w-full rounded-lg font-bold text-sm items-center justify-center"
                >
                  <Sparkles />
                  <Badge text="FS" />
                  <span>Create Few-shot</span>
                </LinkButton>
              </div>
            </>
          </Card>
        </div>
      </div>

      <div className="fixed z-40 bottom-0 left-1/2 transform -translate-x-1/2 m-4">
        {evaluationFinished ? (
          <Button
            variant="green"
            className="px-6 text-md font-bold rounded-xl"
            onClick={showEvaluationResults}
          >
            Show evaluation results
          </Button>
        ) : (
          canStartManualEvaluation && (
            <Button
              variant="green"
              className="px-6 text-md font-bold rounded-lg "
              onClick={openManualEvaluation}
              disabled={papersLoading || !canStartManualEvaluation}
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
            model_name: selectedLlm!.value,
            seed,
            temperature,
            top_p,
          }}
          onClose={() => {
            loadProjects();
            fetchJobs();
            navigate(`/project/${projectUuid}`);
          }}
        />
      )}
      {evaluateViewMatch && paperUuid && (
        <ManualEvaluationModal
          key={paperUuid}
          currentTaskUuid={currentTaskUuid}
          inclusionCriteria={inclusionCriteria || []}
          exclusionCriteria={exclusionCriteria || []}
          papers={papers}
          paperUuid={paperUuid}
          onEvaluated={nextPaper}
          onClose={() => navigate(`/project/${projectUuid}`)}
        />
      )}
    </Layout>
  );
};
