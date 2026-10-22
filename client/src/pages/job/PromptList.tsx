import { PromptRecord } from "../../services/api/client";

const PromptBlock: React.FC<{ label: string; text: string }> = ({ label, text }) => (
  <div className="flex flex-col gap-1">
    <span className="text-xs font-semibold text-slate-600">{label}</span>
    <pre className="text-xs bg-slate-100 rounded-md p-2 whitespace-pre-wrap break-words font-mono">
      {text}
    </pre>
  </div>
);

/** The prompts sent to the model for a task, each collapsed by default. */
export const PromptList: React.FC<{ prompts: PromptRecord[] | null | undefined }> = ({
  prompts,
}) => {
  if (!prompts || prompts.length === 0) {
    return (
      <p className="text-sm text-slate-500" data-testid="task-prompts-missing">
        Prompt not recorded (task ran before prompts were stored).
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {prompts.map((prompt, i) => (
        <details
          key={`${prompt.criterion ?? "all"}_${i}`}
          className="border border-slate-200 rounded-lg p-3"
          data-testid={`task-prompt-${i}`}
        >
          <summary className="cursor-pointer text-sm font-medium text-slate-800">
            {prompt.criterion ? `Prompt for ${prompt.criterion}` : "Prompt"}
          </summary>
          <div className="mt-3 flex flex-col gap-3">
            {prompt.system_prompt && (
              <PromptBlock label="System prompt" text={prompt.system_prompt} />
            )}
            <PromptBlock label="User prompt" text={prompt.user_prompt} />
          </div>
        </details>
      ))}
    </div>
  );
};
