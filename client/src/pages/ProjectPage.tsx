import { useParams, useRoute, useLocation, useSearch, Link } from "wouter";
import { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import { Layout } from "../components/Layout";
import { H6 } from "../components/Typography";
import { DropdownMenuText, DropdownOption, DropdownMenuEllipsis } from "../components/DropDownMenus";
import { FileDropArea } from "../components/FileDropArea";
import { ExpandableToast } from "../components/ExpandableToast";
import { TruncatedFileNames } from "../components/TruncatedFileNames";
import { ConfirmationModal } from "../components/ConfirmationModal";
import { createJob } from "../services/jobService";
import {
  fileUploadToBackend,
  fileFetchFromBackend,
} from "../services/fileService";
import { JobStatus } from "../state/types";
import { ManualEvaluationModal } from "../components/ManualEvaluationModal";
import { Button } from "../components/Button";
import {
  FetchedFile,
  LlmConfig,
  createZeroShotPromptingConfig,
  JobPromptingType,
  Provider,
} from "../state/types";
import axios from "axios";
import Tooltip from "@mui/material/Tooltip";
import { twMerge } from "tailwind-merge";
import {
  ChartCandlestick,
  CircleAlert,
  CircleCheck,
  CircleStop,
  Download,
  FileText,
  Loader,
  Sparkles,
  Square,
  SquareCheckBig,
  Trash2,
  TriangleAlert,
  XCircle
} from "lucide-react";
import { Card } from "../components/Card";
import { TabButton } from "../components/TabButton";
import { useTypedStoreActions, useTypedStoreState } from "../state/store";
import Skeleton from "react-loading-skeleton";
import { NotFoundPage } from "./NotFound";
import { AlertMessage } from "../components/AlertMessage";
import { FewShotModal } from "../components/FewShotModal";
import classNames from "classnames";
import { Badge } from "../components/Badge";
import { useConfig } from "../config/config";
import { retrieve_models } from "../services/llmService";

type ActionComponentProps = {
  hasPapers: boolean;
  projectUuid: string;
  downloadCsv: () => unknown;
};

type ModelConfigurationProps = {
  isLlmSelected: boolean;
  modelParametersSchema?: Provider["model_parameters_json_schema"];
  modelFormValues: Record<string, unknown>;
  setModelFormValue: React.Dispatch<
    React.SetStateAction<Record<string, unknown>>
  >;
};

const ModelConfiguration: React.FC<ModelConfigurationProps> = ({
  isLlmSelected,
  modelParametersSchema,
  modelFormValues,
  setModelFormValue,
}) => {
  if (
    modelParametersSchema === undefined ||
    Object.keys(modelParametersSchema.properties).length === 0
  ) {
    return null;
  }
  return isLlmSelected && modelParametersSchema ? (
    <details className="border border-slate-200 rounded-lg p-4 flex flex-col bg-slate-50 shadow-md">
      <summary className="flex cursor-pointer list-none items-center justify-between">
        <div>
          <div className="text-sm font-medium text-slate-900">Advanced</div>
          <div className="mt-0.5 text-xs text-slate-500 flex gap-2">
            {Object.keys(modelParametersSchema.properties).map((key) => {
              const property = modelParametersSchema.properties[key];
              return (
                <span key={`property_${property.title}`}>{`${property.title}: ${modelFormValues[key] !== undefined &&
                  modelFormValues[key] !== "" &&
                  modelFormValues[key]
                  }`}</span>
              );
            })}
          </div>
        </div>
        <svg
          className="h-4 w-4 text-slate-500 transition-transform duration-200 group-open:rotate-180"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
            clip-rule="evenodd"
          />
        </svg>
      </summary>
      <div className="mt-4">
        {Object.keys(modelParametersSchema.properties).map((key) => {
          const property = modelParametersSchema.properties[key];
          return (
            <div
              className="flex flex-col justify-between gap-1"
              key={`property_${key}`}
            >
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">
                  {property.title}
                </label>
                <span className="text-sm font-medium text-slate-600">
                  {modelFormValues[key] !== undefined &&
                    modelFormValues[key] !== "" ? (
                    <>{modelFormValues[key]}</>
                  ) : (
                    ""
                  )}
                </span>
              </div>
              {property.type === "number" && (
                <input
                  type="range"
                  className="p-2 cursor-pointer disabled:cursor-not-allowed bg-gray-200 accent-slate-800"
                  data-testid={`property_${key}_input`}
                  min={property.minimum}
                  max={property.maximum}
                  step={0.1}
                  onChange={(e) => {
                    setModelFormValue((vals) => ({
                      ...vals,
                      [key]: e.target.value,
                    }));
                  }}
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-expect-error Ok
                  value={modelFormValues[key]}
                />
              )}
              {property.type === "integer" && (
                <input
                  type="number"
                  className="p-2 rounded-lg cursor-pointer disabled:cursor-not-allowed border-gray-400 border-2 accent-slate-800"
                  data-testid={`property_${key}_input`}
                  onChange={(e) => {
                    setModelFormValue((vals) => ({
                      ...vals,
                      [key]: e.target.value,
                    }));
                  }}
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-expect-error Ok
                  value={modelFormValues[key]}
                />
              )}
              <p className="text-xs text-gray-500">{property.description}</p>
            </div>
          );
        })}
      </div>
    </details>
  ) : null;
};

type ProviderConfigurationProps = {
  modelSelected: boolean;
  providerParametersSchema?: Provider["provider_parameters_json_schema"];
  providerFormValues: Record<string, unknown>;
  setProviderFormValue: React.Dispatch<
    React.SetStateAction<Record<string, unknown>>
  >;
};

const ProviderConfiguration: React.FC<ProviderConfigurationProps> = ({
  modelSelected,
  providerParametersSchema,
  providerFormValues,
  setProviderFormValue,
}) => {
  if (
    providerParametersSchema === null ||
    providerParametersSchema === undefined ||
    Object.keys(providerParametersSchema.properties).length === 0
  ) {
    return null;
  }
  const cx = classNames(
    "rounded-lg p-2 h-8 bg-whitecursor-pointer text-sm border-1 border-slate-400 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 bg-white accent-slate-800",
  );
  return providerParametersSchema ? (
    <details className="border border-slate-200 rounded-lg p-4 flex flex-col bg-slate-50 shadow-md w-full">
      <summary className="flex cursor-pointer list-none items-center justify-between">
        <div>
          <div className="text-sm font-medium text-slate-900">Advanced</div>
          <div className="mt-0.5 text-xs text-slate-500 flex gap-2">
            Provider configuration.
          </div>
        </div>
        <svg
          className="h-4 w-4 text-slate-500 transition-transform duration-200 group-open:rotate-180"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
            clip-rule="evenodd"
          />
        </svg>
      </summary>
      <div className="mt-4">
        {Object.keys(providerParametersSchema.properties).map((key) => {
          const property = providerParametersSchema.properties[key];
          return (
            <div
              className="flex flex-col justify-between gap-1 w-full"
              key={`property_${key}`}
            >
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">
                  {property.title}
                </label>
                <span className="text-sm font-medium text-slate-600">
                  {providerFormValues[key] !== undefined &&
                    property.type !== "string" &&
                    providerFormValues[key] !== "" ? (
                    <>{providerFormValues[key]}</>
                  ) : (
                    ""
                  )}
                </span>
              </div>
              {property.type === "number" && (
                <input
                  type="range"
                  disabled={modelSelected}
                  className={cx}
                  data-testid={`property_${key}_input`}
                  min={property.minimum}
                  max={property.maximum}
                  step={0.1}
                  onChange={(e) => {
                    const val =
                      e.target.value === "" ? "" : parseFloat(e.target.value);
                    if (!Number.isNaN(val)) {
                      setProviderFormValue((vals) => ({
                        ...vals,
                        [key]: val,
                      }));
                    }
                  }}
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-expect-error Ok
                  value={providerFormValues[key]}
                />
              )}
              {property.type === "string" && (
                <input
                  type="text"
                  disabled={modelSelected}
                  className={cx}
                  data-testid={`property_${key}_input`}
                  onChange={(e) => {
                    setProviderFormValue((vals) => ({
                      ...vals,
                      [key]: e.target.value,
                    }));
                  }}
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-expect-error Ok
                  value={providerFormValues[key]}
                />
              )}
              {property.type === "integer" && (
                <input
                  type="number"
                  disabled={modelSelected}
                  className={cx}
                  data-testid={`property_${key}_input`}
                  onChange={(e) => {
                    const val =
                      e.target.value === "" ? "" : parseInt(e.target.value, 10);
                    if (!Number.isNaN(val)) {
                      setProviderFormValue((vals) => ({
                        ...vals,
                        [key]: val,
                      }));
                    }
                  }}
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-expect-error Ok
                  value={providerFormValues[key]}
                />
              )}
              <p className="text-xs text-gray-500">{property.description}</p>
            </div>
          );
        })}
      </div>
    </details>
  ) : null;
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
            "px-4 py-2 text-white flex flex-row gap-2 items-center content-center text-sm font-semibold rounded-lg shadow-md transition duration-200 ease-in-out cursor-pointer bg-slate-800 hover:bg-slate-700",
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
        },
      ),
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

type ConfigKeyCheckProps = {
  config_key: string;
  title: string;
  should_show: boolean;
};

const ConfigKeyCheck: React.FC<ConfigKeyCheckProps> = ({
  config_key,
  should_show,
  title,
}) => {
  const { loading, setting } = useConfig(config_key);
  return !loading && setting == null && should_show ? (
    <div>
      <div
        className="inline-flex bg-red-300 rounded-md p-4 items-center w-full"
        data-testid={`error-missing-${config_key}`}
      >
        <span className="font-bold text-sm text-red-900 select-none">
          {title} is not set.
          <br />
          <Link className="text-blue-800" to="/settings">
            Go to settings
          </Link>
        </span>
      </div>
    </div>
  ) : null;
};

export const ProjectPage = () => {
  const params = useParams<{ projectUuid: string }>();
  const { projectUuid } = params;
  const [, navigate] = useLocation();
  const [evaluateViewMatch] = useRoute("/project/:projectUuid/evaluate");
  const [fewShotViewMatch] = useRoute("/project/:projectUuid/few_shot");
  const search = useSearch();

  const [isLlmProviderSelected, setIsLlmProviderSelected] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isLlmSelected, setIsLlmSelected] = useState(false);
  const [promptingStrategy, setPromptingStrategy] = useState<"ZS" | "FS">("ZS");

  const getPapers = useTypedStoreState((state) => state.getPapersForProject);
  const papers = getPapers(projectUuid);

  const [jobToCancel, setJobToCancel] = useState<string | null>(null);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);

  const cancelJob = useTypedStoreActions((actions) => actions.cancelJob);
  const deleteJob = useTypedStoreActions((actions) => actions.deleteJob);

  const [fetchedFiles, setFetchedFiles] = useState<FetchedFile[]>([]);
  const [availableModels, setAvailableModels] = useState<
    Array<{ id: string; created: number; object: "model"; owned_by: string }>
  >([]);

  const loadingProjects = useTypedStoreState((state) => state.loading.projects);
  const loadProjects = useTypedStoreActions((actions) => actions.fetchProjects);
  const getProjectByUuid = useTypedStoreState(
    (state) => state.getProjectByUuid,
  );
  const providers = useTypedStoreState((state) => state.providers);
  const fetchPapers = useTypedStoreActions((actions) => actions.fetchPapers);

  const fetchJobsForProject = useTypedStoreActions(
    (actions) => actions.fetchJobsForProject,
  );
  const jobs = useTypedStoreState(
    (state) => state.jobsByProject[projectUuid] || [],
  );

  const project = getProjectByUuid(projectUuid);

  useEffect(() => {
    if (project !== undefined) {
      fetchPapers(projectUuid);
    }
    fetchModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, projectUuid]);

  useEffect(() => {
    if (projectUuid) {
      fetchJobsForProject(projectUuid);
    }
  }, [projectUuid, fetchJobsForProject]);

  const paperUuid = useMemo(() => {
    if (!search) return null;
    return new URLSearchParams(search).get("paperUuid");
  }, [search]);

  const [selectedLlmProvider, setSelectedLlmProvider] = useState<
    DropdownOption | undefined
  >(undefined);

  const [selectedLlm, setSelectedLlm] = useState<DropdownOption | undefined>(
    undefined,
  );
  const provider = providers.find((p) => p.name === selectedLlmProvider?.value);

  const configParameters = provider?.config_parameters;
  const modelParametersSchema = provider?.model_parameters_json_schema;
  const providerParametersSchema = provider?.provider_parameters_json_schema;
  const defaultProviderValues = useMemo(() => {
    if (!providerParametersSchema) {
      return {};
    }
    return Object.keys(providerParametersSchema.properties).reduce(
      (prev, curr) => {
        const defaultVal = providerParametersSchema.properties[curr].default;
        return {
          ...prev,
          [curr]: defaultVal === undefined ? undefined : defaultVal,
        };
      },
      {},
    );
  }, [providerParametersSchema]);
  const defaultModelValues = useMemo(() => {
    if (!modelParametersSchema) {
      return {};
    }
    return Object.keys(modelParametersSchema.properties).reduce(
      (prev, curr) => {
        const defaultVal = modelParametersSchema.properties[curr].default;
        return {
          ...prev,
          [curr]: defaultVal === undefined ? undefined : defaultVal,
        };
      },
      {},
    );
  }, [modelParametersSchema]);

  const [modelFormValues, setModelFormValue] = useState<
    Record<string, unknown>
  >({});
  useEffect(() => {
    setModelFormValue(defaultModelValues);
  }, [defaultModelValues]);

  const [providerFormValues, setProviderFormValue] = useState<
    Record<string, unknown>
  >({});
  useEffect(() => {
    setProviderFormValue(defaultProviderValues);
  }, [defaultProviderValues]);

  const pendingTasks = useMemo(
    () => papers.filter((paper) => paper.human_result == null),
    [papers],
  );

  const evaluationFinished = jobs.length === 0 && pendingTasks.length === 0;

  const handleTaskCancel = useCallback(() => {
    if (!jobToCancel) {
      return;
    }
    cancelJob({
      jobUuid: jobToCancel,
      projectUuid: projectUuid,
    })
      .then(() => {
        toast.success("Task cancelled successfully", { autoClose: 1500 });
        setJobToCancel(null);
      })
      .catch((error: unknown) => {
        toast.error(`Error canceling task: ${error instanceof Error ? error.message : String(error)}`);
      })
  }, [jobToCancel, projectUuid, cancelJob])

  const handleCancelModalClose = useCallback(() => {
    setJobToCancel(null);
  }, [])

  const handleTaskDelete = useCallback(() => {
    if (!jobToDelete) {
      return;
    }
    deleteJob({ jobUuid: jobToDelete, projectUuid: projectUuid })
      .then(() => {
        toast.success("Task deleted successfully", { autoClose: 1500 });
        setJobToDelete(null);
      })
      .catch((error: unknown) => {
        toast.error(`Error deleting task: ${error instanceof Error ? error.message : String(error)}`);
      })
  }, [jobToDelete, projectUuid, deleteJob])

  const handleDeleteModalClose = useCallback(() => {
    setJobToDelete(null);
  }, [])


  const fetchModels = useCallback(() => {
    async function fetch_models() {
      if (selectedLlmProvider && selectedLlmProvider.value) {
        try {
          setModelsLoaded(false);
          const models = await retrieve_models(
            selectedLlmProvider.value,
            providerFormValues,
          );
          setAvailableModels(models);
          setModelsLoaded(true);
        } catch (error) {
          console.error(
            "Failed to fetch available models for provider " +
            selectedLlmProvider.value,
            error,
          );
        }
      }
    }
    fetch_models().catch();
  }, [providerFormValues, selectedLlmProvider]);

  const paperToTaskMap = useMemo(() => {
    if (
      papers.length === 0 ||
      jobs.length === 0 ||
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
  }, [papers, jobs, pendingTasks]);

  const currentTaskUuid = paperUuid ? paperToTaskMap[paperUuid] : undefined;

  const createZeroShotJob = useCallback(async () => {
    if (!selectedLlm) {
      toast.error("Please select a model before creating a task.");
      return;
    }
    if (!selectedLlmProvider) {
      toast.error("Please select a provider before creating a task.");
      return;
    }
    const llmConfig: LlmConfig = {
      model_name: selectedLlm.value,
      provider_name: selectedLlmProvider.value,
      model_parameters: modelFormValues, // Form values contain all LLM-specific configuration what is needed
      provider_parameters: providerFormValues,
    };

    const promptingConfig = createZeroShotPromptingConfig();

    try {
      await createJob(projectUuid, llmConfig, promptingConfig);
      fetchJobsForProject(projectUuid);
    } catch (e) {
      console.error("Error creating job:", e);
      toast.error("Error creating job");
    }
  }, [
    selectedLlm,
    selectedLlmProvider,
    modelFormValues,
    providerFormValues,
    projectUuid,
    fetchJobsForProject,
  ]);

  const uploadFilesToBackend = useCallback(
    async (files: File[]) => {
      try {
        const res = await fileUploadToBackend(files, projectUuid);
        if (res.valid_filenames?.length) {
          toast.success(`${res.valid_filenames.length} file(s) uploaded`);
        }
        if ((res.empty_abstract_count ?? 0) > 0) {
          toast.warn(`${res.empty_abstract_count} abstracts are empty - results will not be optimal`, { autoClose: 8000 })
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
    [projectUuid],
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
        await fetchPapers(projectUuid);
      } catch (error) {
        console.error("Problem uploading the files", error);
      }
    },
    [
      uploadFilesToBackend,
      fetchFiles,
      projectUuid,
      fetchPapers,
      // loadPapers
    ],
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
        if (jobs.length === 0 || paperToTaskMap[candidate.uuid]) {
          navigate(
            `/project/${projectUuid}/evaluate?paperUuid=${candidate.uuid}`,
          );
          return;
        }
      }
    }
    navigate(`/project/${projectUuid}`);
    toast.success("Manual evaluation finished.");
  }, [
    paperUuid,
    papers,
    jobs.length,
    paperToTaskMap,
    navigate,
    projectUuid,
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
        }).toString()}`,
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

  useEffect(() => {
    if (isLlmProviderSelected && !modelsLoaded) {
      fetchModels();
    }
  }, [fetchModels, isLlmProviderSelected, modelsLoaded]);

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
          {jobs.length === 0 && (
            <AlertMessage message="No screening tasks." />
          )}
          {jobs.map((job) => {
            const successCount = job.stats.success;
            const errorCount = job.stats.failed;
            const totalCount = job.stats.total;
            const completedCount = successCount + errorCount;
            const progress =
              totalCount === 0
                ? 0
                : Math.round((completedCount / totalCount) * 100);
            const status = job.stats.status;

            return (
              <Card key={job.uuid} className="flex-row justify-between">
                <div className="grid grid-cols-[50px_1fr_auto_auto] gap-4 w-full">
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
                      {status === JobStatus.CANCELLED ? (
                        <div className="absolute inset-0 flex gap-2 items-center justify-center text-xs font-semibold select-none">
                          <>
                            <TriangleAlert
                              size={14}
                              className="text-orange-600"
                            />
                            <span className="text-orange-600">
                              Task Cancelled ({completedCount}/{totalCount})
                            </span>
                          </>
                        </div>
                      ) : (
                        <>
                          {status === JobStatus.RUNNING && (
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
                                },
                              )}
                            />
                          )}
                          <div className="absolute inset-0 flex gap-2 items-center justify-center text-xs font-semibold select-none">
                            {status === JobStatus.RUNNING && (
                              <>
                                <Loader
                                  className="animate-spin"
                                  size={16}
                                  strokeWidth={2}
                                />
                                <span>
                                  Screening paper {completedCount} of {totalCount}
                                </span>
                              </>
                            )}
                            {status === JobStatus.SUCCESS && (
                              <>
                                <CircleCheck size={14} className="text-green-600" />
                                <span className="text-green-600">Done</span>
                              </>
                            )}
                            {status === JobStatus.PARTIAL_SUCCESS && (
                              <>
                                <TriangleAlert
                                  size={14}
                                  className="text-orange-600"
                                />
                                <span className="text-orange-600">
                                  Done with errors ({errorCount})
                                </span>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <DropdownMenuEllipsis
                      items={[
                        {
                          label: () => (
                            <div className="text-yellow-700 flex flex-row gap-3 items-center">
                              <CircleStop />
                              <span>Cancel</span>
                            </div>
                          ),
                          onClick: () => setJobToCancel(job.uuid),
                          disabled: progress === 100 || status === JobStatus.CANCELLED,
                        },
                        {
                          label: () => (
                            <div className="text-red-700 flex flex-row gap-3 items-center">
                              <XCircle />
                              <span>Delete</span>
                            </div>
                          ),
                          onClick: () => setJobToDelete(job.uuid),
                        },
                      ]}
                    />
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
          <Card className="relative w-72">
            {fetchedFiles.length === 0 && (
              <div className="absolute select-none z-50 top-0 p-8 left-0 bg-gray-700 opacity-90 w-full h-full rounded-md flex items-center text-center text-white">
                <CircleAlert strokeWidth={2} />
                <span>To create tasks, you must first upload papers.</span>
              </div>
            )}
            <div className="flex flex-col items-start gap-2">
              <label className="text-sm font-medium text-slate-700">
                Provider
              </label>
              <DropdownMenuText
                disabled={false}
                options={providers.map((provider) => ({
                  name: provider.title,
                  value: provider.name,
                }))}
                selected={selectedLlmProvider}
                onSelect={(val) => {
                  setSelectedLlmProvider(val);
                  setAvailableModels([]);
                  setModelsLoaded(false);
                  setIsLlmSelected(false);
                  setSelectedLlm(undefined);
                }}
                isSelected={isLlmProviderSelected}
                setSelected={setIsLlmProviderSelected}
              />
              {/* {isLlmProviderSelected && (
                <div className="text-xs p-2 rounded-lg text-slate-700 inline-flex w-full flex-row gap-2 items-start">
                  <div>
                    <InfoIcon size={16} />
                  </div>
                  <span>
                    {
                      providers.find(
                        (provider) =>
                          provider.name === selectedLlmProvider?.value
                      )?.description
                    }
                  </span>
                </div>
              )} */}
              {isLlmProviderSelected && providerParametersSchema && (
                <ProviderConfiguration
                  modelSelected={isLlmSelected}
                  providerFormValues={providerFormValues}
                  setProviderFormValue={setProviderFormValue}
                  providerParametersSchema={providerParametersSchema}
                />
              )}
            </div>
            {isLlmProviderSelected &&
              configParameters &&
              configParameters.map((param, i) => (
                <ConfigKeyCheck
                  key={`${param.key}_${i}`}
                  config_key={param.key}
                  should_show
                  title={param.title}
                />
              ))}
            <label className="text-sm font-medium text-slate-700">Model</label>
            {!modelsLoaded && (
              <div className="w-full p-1 bg-natural-100 border border-gray-300 h-10 rounded-lg shadow-sm bg-gray-100 focus:outline-none focus:ring-0 opacity-80 select-none text-sm" />
            )}
            {modelsLoaded && (
              <div className="flex flex-col items-start gap-1 w-full">
                <DropdownMenuText
                  disabled={!isLlmProviderSelected || fetchedFiles.length === 0}
                  options={[
                    ...availableModels.map((model) => ({
                      name: model.id,
                      value: model.id,
                    })),
                  ].sort((a, b) => a.name.localeCompare(b.name))}
                  selected={selectedLlm}
                  onSelect={setSelectedLlm}
                  isSelected={isLlmSelected}
                  setSelected={setIsLlmSelected}
                />
              </div>
            )}
            <ModelConfiguration
              isLlmSelected={isLlmSelected}
              modelFormValues={modelFormValues}
              modelParametersSchema={modelParametersSchema}
              setModelFormValue={setModelFormValue}
            />
            <div className="inline-flex rounded-xl bg-slate-50 p-1 ring-1 gap-1 ring-slate-200">
              <button
                type="button"
                className={twMerge(
                  classNames(
                    "rounded-lg px-3 py-2 text-sm  text-slate-900 hover:cursor-pointer",
                    {
                      "bg-blue-600 text-white font-medium shadow-sm hover:cursor-default":
                        promptingStrategy === "ZS",
                      "opacity-20 hover:cursor-default":
                        !isLlmProviderSelected || !isLlmSelected,
                    },
                  ),
                )}
                onClick={() => {
                  if (isLlmProviderSelected && isLlmSelected) {
                    setPromptingStrategy("ZS");
                  }
                }}
                aria-pressed={promptingStrategy === "ZS"}
              >
                Zero-shot
              </button>
              <button
                type="button"
                className={twMerge(
                  classNames(
                    "rounded-lg px-3 py-2 text-sm text-slate-900 hover:cursor-pointer",
                    {
                      "bg-blue-600 text-white font-medium shadow-sm hover:cursor-default":
                        promptingStrategy === "FS",
                      "opacity-20 hover:cursor-default":
                        !isLlmProviderSelected || !isLlmSelected,
                    },
                  ),
                )}
                onClick={() => {
                  if (isLlmProviderSelected && isLlmSelected) {
                    setPromptingStrategy("FS");
                  }
                }}
                aria-pressed={promptingStrategy === "FS"}
              >
                Few-shot
              </button>
            </div>
            <div className="flex justify-start">
              <Button
                variant="purple"
                onClick={() => {
                  if (promptingStrategy === "ZS") {
                    createZeroShotJob();
                  } else {
                    navigate(`/project/${projectUuid}/few_shot`);
                  }
                }}
                disabled={
                  fetchedFiles.length === 0 ||
                  !isLlmProviderSelected ||
                  !isLlmSelected
                }
                title="Create zero-shot task"
                className="w-full rounded-lg font-bold text-sm items-center justify-center"
              >
                <Sparkles />
                <span>Create task</span>
              </Button>
            </div>
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
              disabled={!canStartManualEvaluation}
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
            provider_name: selectedLlmProvider!.value,
            model_name: selectedLlm!.value,
            model_parameters: modelFormValues,
            provider_parameters: {},
          }}
          onClose={() => {
            loadProjects();
            fetchJobsForProject(projectUuid);
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
      {jobToCancel && (
        <ConfirmationModal
          open={true}
          onClose={handleCancelModalClose}
          onConfirm={handleTaskCancel}
          title="Cancel screening task?"
          description="This will cancel running and scheduled screening jobs."
          confirmButtonLabel="Cancel task"
          confirmButtonVariant="yellow"
          confirmButtonIcon={<CircleStop size={16} />}
        />
      )}
      {jobToDelete && (
        <ConfirmationModal
          open={true}
          onClose={handleDeleteModalClose}
          onConfirm={handleTaskDelete}
          title="Delete screening task?"
          description="This action cannot be undone. All data related to this task will be permanently deleted."
          confirmButtonLabel="Delete"
          confirmButtonVariant="red"
          confirmButtonIcon={<Trash2 size={16} />}
        />
      )}
    </Layout>
  );
};
