import { CircleAlert, Sparkles } from "lucide-react";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import type { Project } from "../../../state/types/project";
import { JevScreeningFields } from "./jev/JevScreeningFields";
import { LlmScreeningFields } from "./llm/LlmScreeningFields";
import { ScreeningMethodSelector } from "./ScreeningMethodSelector";
import { TokenEstimate } from "./TokenEstimate";
import { estimateTokens } from "./tokenEstimation";
import { CreateTaskForm } from "./useCreateTaskForm";

type CreateTaskCardProps = {
  form: CreateTaskForm;
  project: Project;
  paperCount: number;
  hasFiles: boolean;
  itemName: string;
  itemNamePlural: string;
  isGithubScreening: boolean;
};

export const CreateTaskCard: React.FC<CreateTaskCardProps> = ({
  form,
  project,
  paperCount,
  hasFiles,
  itemName,
  itemNamePlural,
  isGithubScreening,
}) => {
  const tokenEstimation =
    paperCount > 0
      ? estimateTokens({
          paperCount,
          criteriaCount:
            project.criteria.inclusion_criteria.length + project.criteria.exclusion_criteria.length,
          screeningMethod: form.screeningMethod,
          promptingStrategy: form.promptingStrategy,
        })
      : null;

  return (
    <Card className="relative w-84">
      {!hasFiles && (
        <div className="absolute select-none z-50 top-0 p-8 left-0 bg-gray-700 opacity-90 w-full h-full rounded-md flex items-center text-center text-white">
          <CircleAlert strokeWidth={2} />
          <span>To create tasks, you must first upload {itemNamePlural}.</span>
        </div>
      )}
      <ScreeningMethodSelector form={form} />
      {form.isJevScreening ? (
        <JevScreeningFields
          form={form}
          itemName={itemName}
          isGithubScreening={isGithubScreening}
          hasFiles={hasFiles}
        />
      ) : (
        <LlmScreeningFields
          form={form}
          project={project}
          isGithubScreening={isGithubScreening}
          hasFiles={hasFiles}
        />
      )}
      {tokenEstimation && <TokenEstimate estimation={tokenEstimation} />}
      <div className="flex justify-start">
        <Button
          variant="purple"
          onClick={form.createTask}
          disabled={!hasFiles || !form.isProviderSelected || !form.isModelSelected}
          title="Create task"
          data-testid="create-task-button"
          className="w-full rounded-lg font-bold text-sm items-center justify-center"
        >
          <Sparkles />
          <span>Create task</span>
        </Button>
      </div>
    </Card>
  );
};
