import { useParams, useRoute, useLocation, useSearch } from "wouter";
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
import { fetchJobTasksFromBackend, fetchPapersFromBackend } from "../services/jobTaskService";
import { createJob, fetchJobsForProject } from "../services/jobService";
import { fileUploadToBackend, fileFetchFromBackend } from "../services/fileService";
import { ManualEvaluationModal } from "../components/ManualEvaluationModal";
import { ModelResponse, retrieve_models } from "../services/openRouterService";
import { Project, FetchedFile, ScreeningTask, JobTaskStatus, Paper } from "../state/types";

type LlmConfig = {
  model_name: string;
  temperature: number;
  seed: number;
  top_p: number;
};

type CreatedJob = {
  uuid: string;
  project_uuid: string;
  llm_config: LlmConfig;
  created_at: string;
  updated_at: string;
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
  const [temperature, setTemperature] = useState(0.5);
  const [seed, setSeed] = useState(128);
  const [top_p, setTop_p] = useState(0.5);
  const [isLlmSelected, setIsLlmSelected] = useState(true);
  const [papersLoading, setPapersLoading] = useState(false);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [createdJobs, setCreatedJobs] = useState<CreatedJob[]>([]);
  const [fetchedFiles, setFetchedFiles] = useState<FetchedFile[]>([]);
  const [screeningTasks, setScreeningTasks] = useState<ScreeningTask[]>([]);
  const [error, setError] = useState<string | null>(null);

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
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const project: Project = await fetch_project_by_uuid(uuid);
        setName(project.name);
        setInclusionCriteria(
          project.criteria.inclusion_criteria.map(criteria => criteria.trim()).filter(Boolean)
        );
        setExclusionCriteria(
          project.criteria.exclusion_criteria.map(criteria => criteria.trim()).filter(Boolean)
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
    if (papers.length === 0 || screeningTasks.length === 0) return {};
    const pendingTasks = screeningTasks.filter(task => task.human_result == null);

    if (pendingTasks.length === 0) return {};

    const byDoi: Record<string, string> = {};
    pendingTasks.forEach(task => {
      if (task.doi && !byDoi[task.doi]) {
        byDoi[task.doi] = task.uuid;
      };
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
  }, [papers, screeningTasks]);

  const currentTaskUuid = paperUuid ? paperToTaskMap[paperUuid] : undefined;

  const loadPapers = useCallback(async () => {
    setPapersLoading(true);
    try {
      const fetched = await fetchPapersFromBackend(uuid);
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
      setCreatedJobs(prev => [...prev, createdJob]);
      await loadPapers();
    } catch (e) {
      console.error("Error creating job:", e);
      toast.error("Error creating job");
    }
  }, [uuid, selectedLlm, temperature, seed, top_p, loadPapers]);

  const uploadFilesToBackend = useCallback(async (files: File[]) => {
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
      toast.warn("File upload failed.");
      console.error("File upload error:", e);
      throw e;
    }
  }, [uuid]);

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
      } catch (error) {
        console.error("Problem uploading the files", error);
      }
    },
    [uploadFilesToBackend, fetchFiles]
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
    const interval = setInterval(() => {
      if (createdJobs.length === 0) return;
      Promise.all(createdJobs.map((job) => fetchJobTasksFromBackend(job.uuid)))
        .then((results) => {
          setScreeningTasks(results.flat());
        })
        .catch((error) => {
          console.error("Error fetching job tasks:", error);
        });
    }, jobTaskRefetchIntervalMs);
    return () => clearInterval(interval);
  }, [createdJobs]);

  const openManualEvaluation = useCallback(() => {
    if (papers.length === 0 || screeningTasks.length === 0) {
      toast.warn("No papers available.");
      return;
    }
    const first = papers.find(paper => paperToTaskMap[paper.uuid]);
    if (!first) return;
    navigate(`/project/${uuid}/evaluate?paperUuid=${first.uuid}`);
  }, [papers, screeningTasks, paperToTaskMap, navigate, uuid]);

  const nextPaper = useCallback(() => {
    if (!paperUuid) return;
    const idx = papers.findIndex(paper => paper.uuid === paperUuid);
    if (idx !== -1) {
      for (let i = idx + 1; i < papers.length; i++) {
        const candidate = papers[i];
        if (paperToTaskMap[candidate.uuid]) {
          navigate(`/project/${uuid}/evaluate?paperUuid=${candidate.uuid}`);
          return;
        }
      }
    }
    navigate(`/project/${uuid}`);
    toast.success("Manual evaluation finished.");
  }, [paperUuid, papers, paperToTaskMap, navigate, uuid]);

  useEffect(() => {
    if (match && !paperUuid && papers.length > 0) {
      const first = papers.find(paper => paperToTaskMap[paper.uuid]) || papers[0];
      navigate(`/project/${uuid}/evaluate?paperUuid=${first.uuid}`, { replace: true });
    }
  }, [match, paperUuid, papers, paperToTaskMap, navigate, uuid]);

  const canStartManualEvaluation = useMemo(
    () =>
      papers.length > 0 &&
      screeningTasks.length > 0 &&
      Object.keys(paperToTaskMap).length > 0,
    [papers, screeningTasks, paperToTaskMap]
  );

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
    <Layout title={name}>
      <div className="flex space-x-8 lg:flex-row flex-col items-start">
        <div className="flex flex-col space-y-4 w-7xl">
          <div className="flex gap-4 p-4 w-full bg-neutral-50 rounded-2xl">
            <div className="flex flex-col text-sm text-gray-700 max-w-md">
              <p className="font-bold pb-2">Inclusion criteria:</p>
              <CriteriaList criteria={inclusionCriteria} />
              <p className="font-bold pb-2 mt-4">Exclusion criteria:</p>
              <CriteriaList criteria={exclusionCriteria} />
            </div>
          </div>

          <H4>Screening tasks</H4>
          {screeningTasks.length === 0 && papers.length === 0 && !papersLoading && (
            <p className="text-gray-400 ml-1 pb-4 italic">No screening tasks</p>
          )}
          {createdJobs.map((job, jobIdx) => {
            const jobTasks = screeningTasks.filter(task => task.job_uuid === job.uuid);
            const doneCount = jobTasks.filter(
              task =>
                task.status === JobTaskStatus.DONE || task.human_result !== null
            ).length;
            const totalCount = jobTasks.length;
            const progress =
              totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);
            return (
              <div key={job.uuid} className="mb-6">
                <div className="flex justify-between bg-neutral-50 py-4 rounded-2xl">
                  <p className="flex pl-4 items-center font-semibold">
                    Task #{jobIdx + 1}
                  </p>
                  <div className="flex">
                    <div className="relative w-48 h-8 px-4">
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
                    <div className="flex px-8 text-sm text-red-500 items-center cursor-pointer">
                      Cancel
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col space-y-4">
          <div className="flex flex-col bg-neutral-50 p-4 rounded-2xl">
            <FileDropArea onFilesSelected={handleFilesSelected} />
            <H6 className="pt-4 pb-4">List of papers</H6>
            <TruncatedFileNames files={fetchedFiles} maxLength={25} />
          </div>

          <div className="flex flex-col bg-neutral-50 p-4 rounded-2xl">
            <div className="flex pb-4">
              <H5 className="pr-16">LLM</H5>
              <DropdownMenuText
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

            <p className="text-md font-bold pt-4 pb-4">LLM configuration</p>

            <div className="flex pt-4 pb-4 justify-between">
              <p className="text-md font-semibold">
                Temperature ({temperature})
              </p>
              <input
                type="range"
                className="pl-2 cursor-pointer bg-gray-200"
                data-testid="temperature-input"
                min={0}
                max={1}
                step={0.1}
                value={temperature}
                onChange={e => setTemperature(e.target.valueAsNumber)}
              />
            </div>

            <div className="flex pt-4 pb-4 justify-between items-center">
              <p className="text-md font-semibold">Seed</p>
              <input
                type="number"
                className="p-1 rounded-xl text-center border-gray-300 border-2 hover:bg-gray-100 cursor-pointer"
                data-testid="seed-input"
                value={seed}
                onChange={e => setSeed(e.target.valueAsNumber)}
              />
            </div>

            <div className="flex pt-4 pb-4 justify-between items-center">
              <p className="text-md font-semibold">top_p ({top_p})</p>
              <input
                type="range"
                className="pl-2 cursor-pointer bg-gray-200"
                data-testid="top_p-input"
                min={0}
                max={1}
                step={0.1}
                value={top_p}
                onChange={e => setTop_p(e.target.valueAsNumber)}
              />
            </div>

            <div className="flex justify-end p-4 pb-2">
              <button
                onClick={createTask}
                title="New Task"
                className="bg-green-600 text-white w-fit py-2 px-4 text-md font-bold rounded-2xl shadow-md
                  hover:bg-green-500 transition duration-200 ease-in-out cursor-pointer"
              >
                New Task
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed z-40 bottom-0 left-1/2 transform -translate-x-1/2 m-4">
        <button
          onClick={openManualEvaluation}
          disabled={papersLoading || !canStartManualEvaluation}
          className="bg-purple-700 text-white w-fit py-2 px-6 text-md font-bold rounded-xl shadow-md
            hover:bg-purple-600 transition duration-200 ease-in-out cursor-pointer
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Start manual evaluation
        </button>
      </div>

      {match && paperUuid && currentTaskUuid && (
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
