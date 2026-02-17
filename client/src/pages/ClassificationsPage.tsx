import { useParams, useLocation } from "wouter";
import { useEffect, useState, useCallback } from "react";
import { Layout } from "../components/Layout";
import { H4 } from "../components/Typography";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { TabButton } from "../components/TabButton";
import { useTypedStoreState } from "../state/store";
import { NotFoundPage } from "../pages/NotFound";
import { AlertMessage } from "../components/AlertMessage";
import { ClassificationJobModal } from "../components/ClassificationJobModal";
import { LlmConfig } from "../state/types";
import { Plus, Tags, Trash2 } from "lucide-react";
import {
  ClassificationConfig,
  fetch_classification_configs,
  delete_classification_config,
} from "../services/classificationService";
import { toast } from "react-toastify";

export const ClassificationsPage = () => {
  const params = useParams<{ projectUuid: string }>();
  const { projectUuid } = params;
  const [, navigate] = useLocation();
  const [configs, setConfigs] = useState<ClassificationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJobModal, setShowJobModal] = useState(false);

  const projectByUuid = useTypedStoreState((state) => state.getProjectByUuid);
  const providers = useTypedStoreState((state) => state.providers);
  const project = projectByUuid(projectUuid);

  const loadConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetch_classification_configs(projectUuid);
      setConfigs(data);
    } catch (err) {
      console.error("Failed to load classification configs:", err);
      toast.error("Failed to load classification configurations");
    } finally {
      setLoading(false);
    }
  }, [projectUuid]);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  const handleDelete = useCallback(
    async (uuid: string) => {
      if (!window.confirm("Are you sure you want to delete this configuration?")) {
        return;
      }
      try {
        await delete_classification_config(uuid);
        toast.success("Configuration deleted successfully");
        loadConfigs();
      } catch (err) {
        console.error("Failed to delete config:", err);
        toast.error("Failed to delete configuration");
      }
    },
    [loadConfigs]
  );

  if (!project) {
    return <NotFoundPage />;
  }

  // Use first provider's default LLM config for job modal
  const defaultProvider = providers[0];
  const defaultLlmConfig: LlmConfig = {
    provider_name: defaultProvider?.name || "openrouter",
    model_name: "openai/gpt-4o-mini",
    provider_parameters: {},
    model_parameters: {},
  };

  return (
    <Layout title={project?.name || ""}>
      <div className="flex flex-row mb-4">
        <TabButton href={`/project/${projectUuid}`}>
          Screening tasks
        </TabButton>
        <TabButton href={`/project/${projectUuid}/papers/page/1`}>
          List of papers
        </TabButton>
        <TabButton href={`/project/${projectUuid}/classifications`} active>
          Classifications
        </TabButton>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <H4>Classification Configurations</H4>
          <div className="flex gap-2">
            <Button
              variant="green"
              onClick={() => navigate(`/project/${projectUuid}/classification/new`)}
            >
              <Plus size={18} />
              New Configuration
            </Button>
            {configs.length > 0 && (
              <Button
                variant="purple"
                onClick={() => setShowJobModal(true)}
              >
                <Tags size={18} />
                Start Classification Job
              </Button>
            )}
          </div>
        </div>

        {loading && <AlertMessage message="Loading configurations..." />}

        {!loading && configs.length === 0 && (
          <AlertMessage message="No classification configurations found. Create one to get started." />
        )}

        {!loading && configs.length > 0 && (
          <div className="flex flex-col gap-4">
            {configs.map((config) => (
              <Card key={config.uuid} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-bold text-lg mb-2">{config.name}</div>
                    <div className="text-sm text-gray-700 mb-3">
                      {config.systematic_review_context}
                    </div>
                    <div className="flex flex-col gap-2">
                      {config.classifications.map((dim, idx) => (
                        <div
                          key={idx}
                          className="bg-gray-50 p-2 rounded border border-gray-200"
                        >
                          <div className="font-semibold text-sm text-gray-800">
                            {dim.name}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {dim.classes.map((cls, clsIdx) => (
                              <span
                                key={clsIdx}
                                className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                              >
                                {cls}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Created: {new Date(config.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    variant="red"
                    size="sm"
                    onClick={() => handleDelete(config.uuid)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {showJobModal && (
        <ClassificationJobModal
          onClose={() => setShowJobModal(false)}
          llmConfig={defaultLlmConfig}
        />
      )}
    </Layout>
  );
};
