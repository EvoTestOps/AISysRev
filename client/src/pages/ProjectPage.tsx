import { useParams, useRoute, useLocation } from "wouter";
import { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import { Layout } from "../components/Layout";
import { H4, H5, H6 } from "../components/Typography";
import { CriteriaList } from "../components/CriteriaList";
import { DropdownMenuText } from "../components/DropDownMenus";
import { FileDropArea } from "../components/FileDropArea";
import { ExpandableToast } from "../components/ExpandableToast";
import { TruncatedFileNames } from "../components/TruncatedFileNames";
import { fetch_project_by_uuid } from "../services/projectService"
import { fetchJobTasksFromBackend } from "../services/jobTaskService";
import { createJob, fetchJobsForProject } from "../services/jobService";
import { fileUploadToBackend, fileFetchFromBackend } from "../services/fileService";
import { ManualEvaluationModal } from "../components/ManualEvaluationModal";
import { Project, FetchedFile, ScreeningTask, JobTaskStatus } from "../state/types";

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
  const [selectedTaskUuid, setSelectedTaskUuid] = useState<string | undefined>();
  const jobTaskRefetchIntervalMs = 5000;
  const [name, setName] = useState('');
  const [fetchedFiles, setFetchedFiles] = useState<FetchedFile[]>([])
  const [inclusionCriteria, setInclusionCriteria] = useState<string[]>([]);
  const [exclusionCriteria, setExclusionCriteria] = useState<string[]>([]);
  const [selectedLlm, setSelectedLlm] = useState('');
  const [temperature, setTemperature] = useState(0.5);
  const [seed, setSeed] = useState(128);
  const [top_p, setTop_p] = useState(0.5);
  const [isLlmSelected, setIsLlmSelected] = useState(true)
  const [createdJobs, setCreatedJobs] = useState<CreatedJob[]>([]);
  const [screeningTasks, setScreeningTasks] = useState<ScreeningTask[]>([])
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const project: Project = await fetch_project_by_uuid(uuid);
        setName(project.name);
        setInclusionCriteria(
          project.criteria.inclusion_criteria
            .map((criterion: string) => criterion.trim())
            .filter(Boolean)
        );
        setExclusionCriteria(
          project.criteria.exclusion_criteria
            .map((criterion: string) => criterion.trim())
            .filter(Boolean)
        );
        setError(null);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        if (error.response?.status === 404) {
          setError("Project not found");
          toast.error("Project not found");
        } else {
          setError("Failed to fetch Project");
          toast.error("Failed to fetch Project")
        }
        console.log("Failed to fetch Project", error)
      }
    };
    fetchProject()
  }, [uuid]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const jobs = await fetchJobsForProject(uuid);
        setCreatedJobs(jobs);
      } catch (error) {
        console.error("Failed to fetch jobs for project", error);
      }
    };
    fetchJobs();
  }, [uuid]);

  const createTask = useCallback(async () => {
    if (!selectedLlm) {
      toast.error("Please select a llm model before creating a task.");
      setIsLlmSelected(false)
      return;
    }
    const llmConfig: LlmConfig = {
      model_name: selectedLlm,
      temperature: temperature,
      seed: seed,
      top_p: top_p
    }

    try {
      const res = await createJob(uuid, llmConfig);
      toast.success("Job created successfully!");
      const createdJob: CreatedJob = {
        uuid: res.uuid,
        project_uuid: res.project_uuid,
        llm_config: res.llm_config,
        created_at: res.created_at,
        updated_at: res.updated_at
      };
      setCreatedJobs((prev) => ([...prev, createdJob]));
    } catch (error) {
      console.error("Error creating job:", error);
      toast.error("Error creating job");
    }
  }, [uuid, selectedLlm, temperature, seed, top_p]);

  const uploadFilesToBackend = useCallback(async (files: File[]) => {
    try {
      const res = await fileUploadToBackend(files, uuid);
      if (res.valid_filenames && res.valid_filenames.length > 0) {
        toast.success(`${res.valid_filenames.length} file(s) uploaded`);
      }
      if (res.errors && res.errors.length > 0) {
        ExpandableToast(res.errors);
        console.log("File upload errors:", res.errors);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.warn("File upload failed.");
      console.log("File upload error:", error);
      throw error;
    };
  }, [uuid]);

  const fetchFiles = useCallback(async () => {
    try {
      const files = await fileFetchFromBackend(uuid);
      setFetchedFiles(files);
    } catch (error) {
      toast.warn("Fetching file(s) failed.");
      console.log("File fetch error:", error);
      throw error;
    }
  }, [uuid]);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    try {
      await uploadFilesToBackend(files);
      await fetchFiles();
    } catch (error) {
      console.error("Problem uploading the files", error);
    }
  }, [uploadFilesToBackend, fetchFiles]);

  useEffect(() => {
    (async () => {
      try {
        await fetchFiles();
      } catch (error) {
        console.error("Problem fetching the files", error);
      }
    })();
  }, [fetchFiles]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (createdJobs.length === 0) return;
      Promise.all(createdJobs.map(job => fetchJobTasksFromBackend(job.uuid)))
        .then(results => {
          setScreeningTasks(results.flat());
        })
        .catch(error => {
          console.error("Error fetching job tasks:", error);
        });
    }, jobTaskRefetchIntervalMs);
    return () => clearInterval(interval);
  }, [createdJobs]);

  const openManualEvaluation = (taskUuid: string | undefined) => {
    const taskUuidToOpen = taskUuid ?? screeningTasks[0]?.uuid;
    if (!taskUuidToOpen) return;
    setSelectedTaskUuid(taskUuidToOpen);
    navigate(`/project/${uuid}/evaluate`);
  };

  useEffect(() => {
    if (!selectedTaskUuid && screeningTasks.length > 0) {
      setSelectedTaskUuid(screeningTasks[0].uuid);
    }
  }, [screeningTasks, selectedTaskUuid]);

  if (error) {
    return (
      <Layout title="Error">
        <div className="font-semibold">{error}</div>
      </Layout>
    )
  };

  if (!name) {
    return (
      <Layout title="">
        <div>Loading...</div>
      </Layout>
    )
  };

  if (!inclusionCriteria || !exclusionCriteria) return <div>Loading...</div>;


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
          {screeningTasks.length === 0 && (<p className="text-gray-400 ml-1 pb-4 italic">No screening tasks</p>)}
          {createdJobs.map((job, jobIdx) => {
            const jobTasks = screeningTasks.filter(task => task.job_uuid === job.uuid);
            const doneCount = jobTasks.filter(task => task.status === JobTaskStatus.DONE || task.human_result !== null).length;
            const totalCount = jobTasks.length;
            const progress = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);
            return (
              <div key={job.uuid} className="mb-6">
                <div className="flex justify-between bg-neutral-50 py-4 rounded-2xl">
                  <p className="flex pl-4 items-center font-semibold">Task #{jobIdx + 1}</p>
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
                options={[
                  "gpt-3.5-turbo",
                  "gpt-4o-mini",
                  "chatgpt-4o",
                  "claude-3.5-sonnet",
                  "mistral",
                ]}
                selected={selectedLlm}
                onSelect={setSelectedLlm}
                isLlmSelected={isLlmSelected}
                setIsLlmSelected={setIsLlmSelected}
              />
            </div>

            <p className="text-md font-bold pt-4 pb-4">LLM configuration</p>

            <div className="flex pt-4 pb-4 justify-between">
              <p className="text-md font-semibold">Temperature ({temperature})</p>
              <input
                type="range"
                className="pl-2 cursor-pointer bg-gray-200"
                data-testid="temperature-input"
                min={0}
                max={1}
                step={0.1}
                value={temperature}
                onChange={(e) => {
                  e.preventDefault();
                  setTemperature(e.target.valueAsNumber);
                }}
              />
            </div>

            <div className="flex pt-4 pb-4 justify-between items-center">
              <p className="text-md font-semibold">Seed</p>
              <input
                type="number"
                className="p-1 rounded-xl text-center border-gray-300 border-2 hover:bg-gray-100 cursor-pointer"
                data-testid="seed-input"
                value={seed}
                onChange={(e) => {
                  e.preventDefault();
                  setSeed(e.target.valueAsNumber);
                }}
              />
            </div>

            <div className="flex pt-4 pb-4 justify-between items-center">
              <p className="text-md font-semibold">top_p ({top_p})</p>
              <input
                type="range"
                className="pl-2 cursor-pointer bg-gray-200"
                data-testid="temperature-input"
                min={0}
                max={1}
                step={0.1}
                value={top_p}
                onChange={(e) => {
                  e.preventDefault();
                  setTop_p(e.target.valueAsNumber);
                }}
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
          onClick={() => openManualEvaluation(selectedTaskUuid)}
          disabled={screeningTasks.length === 0}
          className="bg-purple-700 text-white w-fit py-2 px-6 text-md font-bold rounded-xl shadow-md
            hover:bg-purple-600 transition duration-200 ease-in-out cursor-pointer"
        >
          Start manual evaluation
        </button>
      </div>
      {match && selectedTaskUuid && (
        <ManualEvaluationModal
          projectUuid={uuid}
          currentTaskUuid={selectedTaskUuid}
          inclusionCriteria={inclusionCriteria}
          exclusionCriteria={exclusionCriteria}
          onEvaluated={(doneUuid) => {
            setScreeningTasks(prev => {
              const next = prev.filter(task => task.uuid !== doneUuid);
              if (!next.find(task => task.uuid === selectedTaskUuid)) {
                setSelectedTaskUuid(next[0]?.uuid);
              }
              return next;
            });
          }}
          onClose={() => navigate(`/project/${uuid}`)}
        />
      )}
    </Layout>
  );
};