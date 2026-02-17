import { Dialog, DialogPanel, Description } from "@headlessui/react";
import { CircleX, Tags } from "lucide-react";
import { H3, H4 } from "./Typography";
import { Button } from "./Button";
import { useTypedStoreState } from "../state/store";
import { useParams } from "wouter";
import { LlmConfig } from "../state/types";
import { useCallback, useState, useEffect } from "react";
import { AlertMessage } from "./AlertMessage";
import { api } from "../services/api";
import {
  ClassificationConfig,
  fetch_classification_configs,
} from "../services/classificationService";

type ClassificationJobModalProps = {
  onClose: () => void;
  llmConfig: LlmConfig;
};

export const ClassificationJobModal: React.FC<
  ClassificationJobModalProps
> = ({ onClose, llmConfig }) => {
  const params = useParams<{ projectUuid: string }>();
  const { projectUuid } = params;
  const [configs, setConfigs] = useState<ClassificationConfig[]>([]);
  const [selectedConfigUuid, setSelectedConfigUuid] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projectByUuid = useTypedStoreState((state) => state.getProjectByUuid);
  const project = projectByUuid(projectUuid);

  useEffect(() => {
    const loadConfigs = async () => {
      try {
        const data = await fetch_classification_configs(projectUuid);
        setConfigs(data);
        if (data.length > 0) {
          setSelectedConfigUuid(data[0].uuid);
        }
      } catch (err) {
        console.error("Failed to load classification configs:", err);
        setError("Failed to load classification configurations");
      }
    };
    loadConfigs();
  }, [projectUuid]);

  const createClassificationJob = useCallback(async () => {
    if (!selectedConfigUuid) {
      setError("Please select a classification configuration");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.post("/api/v1/classification-job", {
        classification_config_uuid: selectedConfigUuid,
        llm_config: llmConfig,
        paper_uuids: null, // Classify all papers
      });
      onClose();
    } catch (e) {
      console.error("Error creating classification job:", e);
      setError("Failed to create classification job. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [selectedConfigUuid, llmConfig, onClose]);

  if (!project) {
    return null;
  }

  return (
    <Dialog
      open={true}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClose={onClose}
    >
      <div className="fixed inset-0 bg-black/60" aria-hidden="true" />
      <DialogPanel className="relative bg-white p-6 shadow-2xl rounded-xl w-full md:w-3/4 lg:w-1/2">
        <CircleX
          onClick={onClose}
          className="absolute top-4 right-4 h-5 w-5 cursor-pointer text-gray-500 hover:text-gray-700 transition duration-200"
        />
        <div className="flex flex-col gap-4">
          <H3>Start Classification Job</H3>
          <Description className="px-4 py-2 border-l-4 bg-blue-50 border-blue-400 text-blue-700 text-sm">
            <strong>Classification</strong> assigns papers to one or more
            classes based on your classification taxonomy. All papers in the
            project will be classified using the selected configuration.
          </Description>

          <H4>Select Classification Configuration</H4>

          {configs.length === 0 && (
            <AlertMessage message="No classification configurations found. Please create one first." />
          )}

          {configs.length > 0 && (
            <div className="flex flex-col gap-2">
              {configs.map((config) => (
                <div
                  key={config.uuid}
                  onClick={() => setSelectedConfigUuid(config.uuid)}
                  className={`p-3 border-2 rounded-lg cursor-pointer transition ${
                    selectedConfigUuid === config.uuid
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <div className="font-semibold">{config.name}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {config.systematic_review_context}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {config.classifications.map((dim, idx) => (
                      <div
                        key={idx}
                        className="text-xs bg-gray-100 px-2 py-1 rounded"
                      >
                        <strong>{dim.name}:</strong> {dim.classes.join(", ")}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <AlertMessage message={error} />
          )}

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="gray" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="purple"
              onClick={createClassificationJob}
              disabled={!selectedConfigUuid || loading || configs.length === 0}
            >
              <Tags />
              <span>{loading ? "Starting..." : "Start Classification"}</span>
            </Button>
          </div>
        </div>
      </DialogPanel>
    </Dialog>
  );
};
