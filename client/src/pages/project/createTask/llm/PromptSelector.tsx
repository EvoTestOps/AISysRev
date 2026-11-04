import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";
import Skeleton from "@mui/material/Skeleton";
import TextField from "@mui/material/TextField";
import { Link as RouterLink } from "wouter";
import { promptVersionLabel } from "../../../prompts/promptLabels";
import { CreateTaskForm } from "../../hooks/useCreateTaskForm";
import { FieldGroup, FieldLabel } from "../controls";

type PromptSelectorProps = {
  form: CreateTaskForm;
  disabled: boolean;
};

/** Which prompt the model gets: the built-in one, or one of the user's for this strategy. */
export const PromptSelector: React.FC<PromptSelectorProps> = ({ form, disabled }) => {
  const { strategyPrompts, selectedPrompt, setPromptVersionUuid } = form;
  return (
    <FieldGroup disabled={disabled}>
      <div className="flex items-center justify-between gap-2">
        <FieldLabel
          label="Prompt"
          tooltip="The instructions sent to the model. The task keeps the exact version it ran with."
        />
        <Link component={RouterLink} href="/prompts" variant="caption" underline="hover">
          Manage prompts
        </Link>
      </div>
      {strategyPrompts === null ? (
        <Skeleton variant="rounded" height={40} />
      ) : (
        <TextField
          select
          size="small"
          fullWidth
          value={selectedPrompt?.latest_version.uuid ?? ""}
          onChange={(e) => {
            const chosen = strategyPrompts.find((p) => p.latest_version.uuid === e.target.value);
            setPromptVersionUuid(chosen && !chosen.is_default ? chosen.latest_version.uuid : null);
          }}
          slotProps={{
            select: {
              renderValue: () =>
                selectedPrompt
                  ? promptVersionLabel(selectedPrompt.name, selectedPrompt.latest_version.version)
                  : "Built-in prompt",
            },
          }}
        >
          {strategyPrompts.map((prompt) => (
            <MenuItem key={prompt.uuid} value={prompt.latest_version.uuid}>
              {promptVersionLabel(prompt.name, prompt.latest_version.version)}
              {prompt.is_default && (
                <Chip label="Built-in" size="small" variant="outlined" sx={{ ml: 1 }} />
              )}
            </MenuItem>
          ))}
        </TextField>
      )}
    </FieldGroup>
  );
};
