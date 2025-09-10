import { useParams, useRoute, useLocation, useSearch, Link } from "wouter";
import { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import { Layout } from "../components/Layout";
import { H4, H5, H6 } from "../components/Typography";
import { CriteriaList } from "../components/CriteriaList";
import { DropdownMenuText, DropdownOption } from "../components/DropDownMenus";
import { FileDropArea } from "../components/FileDropArea";
import { ExpandableToast } from "../components/ExpandableToast";
import { TruncatedFileNames } from "../components/TruncatedFileNames";
import { fetch_project_by_uuid } from "../services/projectService";
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
  Project,
  FetchedFile,
  ScreeningTask,
  JobTaskStatus,
  Paper,
  CreatedJob,
  LlmConfig,
} from "../state/types";
import axios from "axios";
import Tooltip from "@mui/material/Tooltip";
import { useConfig } from "../config/config";
import { twMerge } from "tailwind-merge";
import { ChartCandlestick, Download, FileText, Sparkles } from "lucide-react";

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
        variant="gray"
        onClick={downloadCsv}
        title="Download CSV"
        disabled={!hasPapers}
      >
        <div className="flex flex-row gap-2 items-center">
          <Download />
          <span>Download CSV</span>
        </div>
      </Button>
      {hasPapers && (
        <a
          className={twMerge(
            "px-4 py-2 text-white text-sm font-semibold rounded-lg shadow-md transition duration-200 ease-in-out cursor-pointer bg-gray-700 hover:bg-gray-600"
          )}
          href={`/api/v1/result/html?${new URLSearchParams({
            project_uuid: projectUuid,
          }).toString()}`}
          target="__blank"
          rel="noopener noreferrer"
          title="Show HTML"
        >
          <div className="flex flex-row gap-2 items-center">
            <FileText />
            <span>Show HTML</span>
          </div>
        </a>
      )}
    </div>
  );
};

export const ProjectPage = () => {
  const params = useParams<{ uuid: string }>();
  const uuid = params.uuid;
  const [, navigate] = useLocation();
  const [match] = useRoute("/project/:uuid/evaluate");
  const search = useSearch();
  const jobTaskRefetchIntervalMs = 5000;
  const [name, setName] = useState("");
  const [inclusionCriteria, setInclusionCriteria] = useState<string[]>([]);
  const [exclusionCriteria, setExclusionCriteria] = useState<string[]>([]);
  const [temperature, setTemperature] = useState(0);
  const [seed, setSeed] = useState(128);
  const [top_p, setTop_p] = useState(0.1);
  const [isLlmSelected, setIsLlmSelected] = useState(true);
  const [papersLoading, setPapersLoading] = useState(false);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [createdJobs, setCreatedJobs] = useState<CreatedJob[]>([]);
  const [fetchedFiles, setFetchedFiles] = useState<FetchedFile[]>([]);
  const [screeningTasks, setScreeningTasks] = useState<ScreeningTask[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  const evaluationFinished =
    screeningTasks.length > 0 && pendingTasks.length === 0;

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const project: Project = await fetch_project_by_uuid(uuid);
        setName(project.name);
        setInclusionCriteria(
          project.criteria.inclusion_criteria
            .map((criteria) => criteria.trim())
            .filter(Boolean)
        );
        setExclusionCriteria(
          project.criteria.exclusion_criteria
            .map((criteria) => criteria.trim())
            .filter(Boolean)
        );
        setError(null);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        if (e.response?.status === 404) {
          setError("Project not found");
          toast.error("Project not found");
        } else {
          setError("Failed to fetch Project");
          toast.error("Failed to fetch Project");
        }
        console.error("Failed to fetch Project", e);
      }
    };
    fetchProject();
  }, [uuid]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const jobs = await fetchJobsForProject(uuid);
        setCreatedJobs(jobs);
      } catch (e) {
        console.error("Failed to fetch jobs for project", e);
      }
    };
    fetchJobs();
  }, [uuid]);

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
      screeningTasks.length === 0 ||
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
  }, [papers, screeningTasks, pendingTasks]);

  const currentTaskUuid = paperUuid ? paperToTaskMap[paperUuid] : undefined;

  const loadPapers = useCallback(async () => {
    setPapersLoading(true);
    try {
      const fetched = await fetchPapersFromBackend(uuid);
      console.log("Fetched papers", fetched);
      setPapers(fetched);
    } catch (e) {
      console.error("Failed to fetch papers", e);
    } finally {
      setPapersLoading(false);
    }
  }, [uuid]);

  useEffect(() => {
    loadPapers();
  }, [loadPapers]);

  const createTask = useCallback(async () => {
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

    try {
      const res = await createJob(uuid, llmConfig);
      const createdJob: CreatedJob = {
        uuid: res.uuid,
        project_uuid: res.project_uuid,
        llm_config: res.llm_config,
        created_at: res.created_at,
        updated_at: res.updated_at,
      };
      setCreatedJobs((prev) => [...prev, createdJob]);
      await loadPapers();
    } catch (e) {
      console.error("Error creating job:", e);
      toast.error("Error creating job");
    }
  }, [uuid, selectedLlm, temperature, seed, top_p, loadPapers]);

  const uploadFilesToBackend = useCallback(
    async (files: File[]) => {
      try {
        const res = await fileUploadToBackend(files, uuid);
        if (res.valid_filenames?.length) {
          toast.success(`${res.valid_filenames.length} file(s) uploaded`);
        }
        if (res.errors?.length) {
          ExpandableToast(res.errors);
          console.log("File upload errors:", res.errors);
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
    [uuid]
  );

  const fetchFiles = useCallback(async () => {
    try {
      const files = await fileFetchFromBackend(uuid);
      setFetchedFiles(files);
    } catch (e) {
      toast.warn("Fetching file(s) failed.");
      console.error("File fetch error:", e);
      throw e;
    }
  }, [uuid]);

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
          console.log("job.uuid", job.uuid);
          // @ts-expect-error Expected
          return fetchJobTasksFromBackend(job.uuid, job.id);
        })
      )
        .then((results) => {
          setScreeningTasks(results.flat());
          console.log("results: ", results.flat());
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
    navigate(`/project/${uuid}/evaluate?paperUuid=${target.uuid}`);
  }, [papers, paperToTaskMap, navigate, uuid, evaluationFinished]);

  const nextPaper = useCallback(async () => {
    if (!paperUuid) return;
    const idx = papers.findIndex((paper) => paper.uuid === paperUuid);
    if (idx !== -1) {
      for (let i = idx + 1; i < papers.length; i++) {
        const candidate = papers[i];
        if (screeningTasks.length === 0 || paperToTaskMap[candidate.uuid]) {
          navigate(`/project/${uuid}/evaluate?paperUuid=${candidate.uuid}`);
          return;
        }
      }
    }
    await loadPapers();
    navigate(`/project/${uuid}`);
    toast.success("Manual evaluation finished.");
  }, [
    paperUuid,
    papers,
    screeningTasks.length,
    paperToTaskMap,
    navigate,
    uuid,
    loadPapers,
  ]);

  useEffect(() => {
    if (match && !paperUuid && papers.length > 0) {
      const first =
        papers.find((paper) => paperToTaskMap[paper.uuid]) || papers[0];
      navigate(`/project/${uuid}/evaluate?paperUuid=${first.uuid}`, {
        replace: true,
      });
    }
  }, [match, paperUuid, papers, paperToTaskMap, navigate, uuid]);

  const canStartManualEvaluation = papers.length > 0;

  const showEvaluationResults = useCallback(() => {
    if (!evaluationFinished) return;
    navigate(`/result/${uuid}`);
  }, [evaluationFinished, navigate, uuid]);

  const downloadCsv = useCallback(() => {
    async function dl() {
      if (!uuid) return;
      const response = await fetch(
        `/api/v1/result/download_result_csv?${new URLSearchParams({
          project_uuid: uuid,
        }).toString()}`
      );
      if (!response.ok) {
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `project_${uuid}_results.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    }
    dl().catch(console.error);
  }, [uuid]);

  const hasPapers = papers && papers.length > 0;

  if (error) {
    return (
      <Layout title="Error">
        <div className="font-semibold">{error}</div>
      </Layout>
    );
  }
  if (!name || !inclusionCriteria || !exclusionCriteria) {
    return (
      <Layout title="">
        <div>Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout
      title={name}
      navbarActionComponent={() => (
        <ActionComponent
          hasPapers={hasPapers}
          downloadCsv={downloadCsv}
          projectUuid={uuid}
        />
      )}
    >
      <div className="flex space-x-8 lg:flex-row flex-col items-start">
        <div className="flex flex-col space-y-4 w-7xl">
          <div className="flex flex-col gap-2 p-4 w-full bg-neutral-50 rounded-lg">
            <H6>Inclusion criteria</H6>
            <CriteriaList criteria={inclusionCriteria} />
            <H6>Exclusion criteria</H6>
            <CriteriaList criteria={exclusionCriteria} />
          </div>

          <H4>Screening tasks</H4>
          {screeningTasks.length === 0 &&
            papers.length === 0 &&
            !papersLoading && (
              <p className="text-gray-400 ml-1 pb-4 italic">
                No screening tasks
              </p>
            )}
          {createdJobs.map((job) => {
            const jobTasks = screeningTasks.filter((task) => {
              console.log(
                "task.job_uuid:",
                task.job_uuid,
                "job.uuid:",
                job.uuid
              );
              return task.job_uuid === job.uuid;
            });
            const doneCount = jobTasks.filter(
              (task) => task.status === JobTaskStatus.DONE
            ).length;
            const totalCount = jobTasks.length;
            const progress =
              totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);
            console.log("totalCount: ", totalCount);
            console.log("doneCount: ", doneCount);
            console.log("progress: ", progress);
            return (
              <div key={job.uuid} className="mb-6">
                <div className="flex flex-row justify-between bg-neutral-50 p-4 gap-4 rounded-2xl">
                  <div className="flex items-center font-semibold">
                    <Tooltip title={job.llm_config.model_name} enterDelay={50}>
                      <span className="text-sm text-nowrap">
                        {job.llm_config.model_name.length > 30
                          ? job.llm_config.model_name.substring(0, 17) + "..."
                          : job.llm_config.model_name}
                      </span>
                    </Tooltip>
                  </div>
                  <div className="relative w-48 h-8">
                    <progress
                      value={progress}
                      max={100}
                      className="h-full w-full
                            [&::-webkit-progress-bar]:rounded-xl
                            [&::-webkit-progress-bar]:bg-gray-400
                            [&::-webkit-progress-value]:bg-blue-200
                            [&::-webkit-progress-value]:rounded-xl
                          "
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
                      {doneCount}/{totalCount}
                    </div>
                  </div>
                  {/* <div className="flex text-sm text-red-500 items-center cursor-pointer">
                    Cancel
                  </div>
                  <div className="flex text-sm text-blue-500 items-center cursor-pointer">
                    View
                  </div> */}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col space-y-4">
          <div className="flex flex-col gap-4 bg-neutral-50 p-4 rounded-lg">
            {fetchedFiles.length == 0 && (
              <div className="pb-4">
                <FileDropArea onFilesSelected={handleFilesSelected} />
              </div>
            )}
            <H5>List of papers</H5>
            <TruncatedFileNames files={fetchedFiles} maxLength={25} />
          </div>

          <div className="flex flex-col gap-6 bg-neutral-50 p-4 rounded-lg">
            <H4>Create task</H4>
            <div className="flex">
              <H5 className="pr-16">LLM</H5>
              <DropdownMenuText
                disabled={openrouterKey == null}
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
            <p className="text-md font-bold">LLM configuration</p>
            <div className="flex justify-between">
              <p className="text-md font-semibold">
                Temperature ({temperature})
              </p>
              <input
                type="range"
                className="pl-2 cursor-pointer disabled:cursor-not-allowed bg-gray-200"
                data-testid="temperature-input"
                min={0}
                max={1}
                step={0.1}
                value={temperature}
                disabled={openrouterKey == null}
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
                disabled={openrouterKey == null}
                onChange={(e) => setSeed(e.target.valueAsNumber)}
              />
            </div>
            <div className="flex justify-between items-center">
              <p className="text-md font-semibold">top_p ({top_p})</p>
              <input
                type="range"
                className="pl-2 cursor-pointer disabled:cursor-not-allowed bg-gray-200"
                data-testid="top_p-input"
                min={0.1}
                max={1}
                step={0.1}
                value={top_p}
                disabled={openrouterKey == null}
                onChange={(e) => setTop_p(e.target.valueAsNumber)}
              />
            </div>
            <div>
              {!openrouterKeyLoading && openrouterKey == null && (
                <div className="flex bg-red-300 rounded-md p-4 items-center">
                  <span className="font-bold text-sm text-red-900 select-none">
                    OpenRouter API key is not set
                    <br />
                    <Link className="text-blue-800" to="/settings">
                      Go to settings
                    </Link>
                  </span>
                </div>
              )}
            </div>
            <div className="flex justify-start">
              <Button
                variant="green"
                onClick={createTask}
                disabled={openrouterKey == null || fetchedFiles.length === 0}
                title="Create"
                className="w-full rounded-lg font-bold text-sm disabled:bg-green-600"
              >
                <div className="flex flex-row items-center justify-center gap-2">
                  <Sparkles />
                  <span>Create</span>
                </div>
              </Button>
            </div>
          </div>
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
              variant="purple"
              className="px-6 text-md font-bold rounded-lg disabled:bg-purple-600"
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

      {match && paperUuid && (
        <ManualEvaluationModal
          key={paperUuid}
          currentTaskUuid={currentTaskUuid}
          inclusionCriteria={inclusionCriteria}
          exclusionCriteria={exclusionCriteria}
          papers={papers}
          paperUuid={paperUuid}
          onEvaluated={nextPaper}
          onClose={() => navigate(`/project/${uuid}`)}
        />
      )}
    </Layout>
  );
};
