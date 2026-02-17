import { useState, useCallback } from "react";
import { useLocation, useRoute } from "wouter";
import { toast } from "react-toastify";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import { Layout } from "../components/Layout";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { H6 } from "../components/Typography";
import { create_classification_config } from "../services/classificationService";
import type {
  ClassificationDimension,
  ClassificationConfigCreate,
} from "../state/types/classification";

export const ClassificationConfigPage = () => {
  const [, params] = useRoute("/project/:projectUuid/classification/new");
  const projectUuid = params?.projectUuid || "";
  const [, navigate] = useLocation();

  const [name, setName] = useState("");
  const [context, setContext] = useState("");
  const [dimensions, setDimensions] = useState<ClassificationDimension[]>([
    { name: "", classes: [""] },
  ]);

  const addDimension = useCallback(() => {
    setDimensions([...dimensions, { name: "", classes: [""] }]);
  }, [dimensions]);

  const removeDimension = useCallback((index: number) => {
    setDimensions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateDimensionName = useCallback((index: number, name: string) => {
    setDimensions((prev) =>
      prev.map((dim, i) => (i === index ? { ...dim, name } : dim))
    );
  }, []);

  const addClass = useCallback((dimIndex: number) => {
    setDimensions((prev) =>
      prev.map((dim, i) =>
        i === dimIndex ? { ...dim, classes: [...dim.classes, ""] } : dim
      )
    );
  }, []);

  const removeClass = useCallback((dimIndex: number, classIndex: number) => {
    setDimensions((prev) =>
      prev.map((dim, i) =>
        i === dimIndex
          ? { ...dim, classes: dim.classes.filter((_, ci) => ci !== classIndex) }
          : dim
      )
    );
  }, []);

  const updateClass = useCallback(
    (dimIndex: number, classIndex: number, value: string) => {
      setDimensions((prev) =>
        prev.map((dim, i) =>
          i === dimIndex
            ? {
                ...dim,
                classes: dim.classes.map((c, ci) =>
                  ci === classIndex ? value : c
                ),
              }
            : dim
        )
      );
    },
    []
  );

  const handleSave = useCallback(async () => {
    // Validation
    if (!name.trim()) {
      toast.error("Configuration name is required");
      return;
    }
    if (!context.trim()) {
      toast.error("Systematic review context is required");
      return;
    }
    if (dimensions.length === 0) {
      toast.error("At least one classification dimension is required");
      return;
    }

    // Validate dimensions
    const validDimensions = dimensions.filter(
      (dim) =>
        dim.name.trim() &&
        dim.classes.filter((c) => c.trim()).length >= 2
    );

    if (validDimensions.length === 0) {
      toast.error(
        "Each classification dimension must have a name and at least 2 classes"
      );
      return;
    }

    // Clean up data
    const cleanDimensions: ClassificationDimension[] = validDimensions.map(
      (dim) => ({
        name: dim.name.trim(),
        classes: dim.classes.filter((c) => c.trim()).map((c) => c.trim()),
      })
    );

    const config: ClassificationConfigCreate = {
      project_uuid: projectUuid,
      name: name.trim(),
      systematic_review_context: context.trim(),
      classifications: cleanDimensions,
    };

    try {
      await create_classification_config(config);
      toast.success("Classification configuration created successfully!");
      navigate(`/project/${projectUuid}`);
    } catch (error: any) {
      console.error("Failed to create classification config:", error);
      toast.error(
        error?.response?.data?.detail ||
          "Failed to create classification configuration"
      );
    }
  }, [name, context, dimensions, projectUuid, navigate]);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate(`/project/${projectUuid}`)}
              variant="gray"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Project
            </Button>
            <H6>Create Classification Configuration</H6>
          </div>
          <Button onClick={handleSave} variant="green">
            <Save className="w-4 h-4 mr-2" />
            Save Configuration
          </Button>
        </div>

        <Card className="mb-6 p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Configuration Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Software Testing Taxonomy"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Systematic Review Context
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Describe the context of your systematic review..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Classification Dimensions</h3>
            <Button onClick={addDimension} variant="purple" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Dimension
            </Button>
          </div>

          {dimensions.map((dimension, dimIndex) => (
            <Card key={dimIndex} className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <input
                    type="text"
                    value={dimension.name}
                    onChange={(e) =>
                      updateDimensionName(dimIndex, e.target.value)
                    }
                    placeholder="e.g., Application Domain"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {dimensions.length > 1 && (
                    <Button
                      onClick={() => removeDimension(dimIndex)}
                      variant="red"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="pl-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Classes
                    </label>
                    <Button
                      onClick={() => addClass(dimIndex)}
                      variant="purple"
                      size="sm"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Class
                    </Button>
                  </div>

                  {dimension.classes.map((className, classIndex) => (
                    <div key={classIndex} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={className}
                        onChange={(e) =>
                          updateClass(dimIndex, classIndex, e.target.value)
                        }
                        placeholder={`Class ${classIndex + 1}`}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {dimension.classes.length > 2 && (
                        <Button
                          onClick={() => removeClass(dimIndex, classIndex)}
                          variant="red"
                          size="sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Tip:</strong> Each classification dimension can have multiple
            classes. Papers will be evaluated for each class with a probability
            score (0.0-1.0). The class with the highest probability ≥ 0.5 will be
            chosen, otherwise "other" is assigned.
          </p>
        </div>
      </div>
    </Layout>
  );
};
