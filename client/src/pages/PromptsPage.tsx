import AddIcon from "@mui/icons-material/Add";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Link } from "wouter";
import { ConfirmationModal } from "../components/ConfirmationModal";
import { Layout } from "../components/Layout";
import { riseIn } from "../components/motion";
import { deletePrompt, fetchPrompts, promptErrorMessage } from "../services/promptService";
import type { Prompt } from "../state/types/prompt";
import {
  PROMPT_TYPE_LABELS,
  SCREENING_TARGET_LABELS,
  formatPromptDate,
} from "./prompts/promptLabels";
import { PromptSourceChip } from "./prompts/PromptSource";

type PromptRowProps = {
  prompt: Prompt;
  onDelete?: (prompt: Prompt) => void;
};

const PromptRow: React.FC<PromptRowProps> = ({ prompt, onDelete }) => (
  <ListItem
    divider
    disablePadding
    data-testid={`prompt-row-${prompt.uuid}`}
    secondaryAction={
      <Stack direction="row" spacing={0.5}>
        <Tooltip title="Duplicate">
          <IconButton
            component={Link}
            href={`/prompts/new?from=${prompt.uuid}`}
            aria-label={`Duplicate ${prompt.name}`}
            data-testid={`duplicate-prompt-${prompt.uuid}`}
          >
            <ContentCopyOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {onDelete && (
          <Tooltip title="Delete">
            <IconButton
              aria-label={`Delete ${prompt.name}`}
              onClick={() => onDelete(prompt)}
              data-testid={`delete-prompt-${prompt.uuid}`}
            >
              <DeleteOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    }
  >
    <ListItemButton
      component={Link}
      href={`/prompts/${prompt.uuid}`}
      sx={{ py: 1.5, pr: onDelete ? 14 : 8 }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          <Typography variant="subtitle2">{prompt.name}</Typography>
          <Chip size="small" label={PROMPT_TYPE_LABELS[prompt.prompting_type].label} />
          <Chip
            size="small"
            variant="outlined"
            label={SCREENING_TARGET_LABELS[prompt.screening_target]}
          />
          {prompt.source && <PromptSourceChip source={prompt.source} />}
        </Stack>
        {prompt.description && (
          <Typography variant="body2" color="textSecondary" noWrap>
            {prompt.description}
          </Typography>
        )}
        <Typography variant="caption" color="textSecondary">
          Version {prompt.latest_version.version} · Updated{" "}
          {formatPromptDate(prompt.latest_version.created_at)}
        </Typography>
      </Box>
    </ListItemButton>
  </ListItem>
);

type PromptSectionProps = React.PropsWithChildren<{
  title: string;
  description: string;
  icon?: React.ReactNode;
  index: number;
}>;

const PromptSection: React.FC<PromptSectionProps> = ({
  title,
  description,
  icon,
  index,
  children,
}) => (
  <Box
    component="section"
    sx={{ display: "flex", flexDirection: "column", gap: 1, ...riseIn(index) }}
  >
    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
      {icon}
      <Typography variant="h6" component="h2">
        {title}
      </Typography>
    </Stack>
    <Typography variant="body2" color="textSecondary">
      {description}
    </Typography>
    <Paper variant="outlined" sx={{ borderRadius: 2, mt: 1 }}>
      {children}
    </Paper>
  </Box>
);

const RowsSkeleton = () => (
  <List disablePadding>
    {[0, 1, 2].map((i) => (
      <ListItem key={i} divider sx={{ py: 1.5, display: "block" }}>
        <Skeleton width={220} />
        <Skeleton width={320} />
      </ListItem>
    ))}
  </List>
);

/** The account's prompts and the built-in ones, shared by all its projects. */
export const PromptsPage = () => {
  const [prompts, setPrompts] = useState<Prompt[] | null>(null);
  const [deleting, setDeleting] = useState<Prompt | null>(null);

  const load = useCallback(async () => {
    try {
      setPrompts(await fetchPrompts());
    } catch (e) {
      console.error("Fetching prompts failed", e);
      toast.error("Could not load the prompts.");
      setPrompts([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const confirmDelete = async () => {
    if (!deleting) return;
    const prompt = deleting;
    setDeleting(null);
    try {
      await deletePrompt(prompt.uuid);
      toast.success(`Deleted "${prompt.name}".`);
      load();
    } catch (e) {
      toast.error(promptErrorMessage(e, "Could not delete the prompt."));
    }
  };

  const own = prompts?.filter((p) => !p.is_default) ?? [];
  const builtIn = prompts?.filter((p) => p.is_default) ?? [];

  return (
    <Layout
      title="Prompts"
      headerActions={
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          component={Link}
          href="/prompts/new"
          data-testid="new-prompt-button"
        >
          New prompt
        </Button>
      }
    >
      <Stack spacing={4}>
        <Typography variant="body2" color="textSecondary" sx={{ maxWidth: 720 }}>
          Prompts tell the model how to screen. They are shared by all of your projects, and you
          pick one when you start a screening task. Every save is kept as a new version, so each
          task records exactly which text it ran with.
        </Typography>

        <PromptSection
          title="My prompts"
          description="Prompts you have written or duplicated. Only you can see them."
          index={0}
        >
          {prompts === null ? (
            <RowsSkeleton />
          ) : own.length === 0 ? (
            <Box sx={{ p: 3 }} data-testid="no-own-prompts">
              <Typography variant="body2" color="textSecondary">
                You have no prompts of your own yet. Duplicate a built-in prompt below to start from
                it, or create a new one.
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {own.map((prompt) => (
                <PromptRow key={prompt.uuid} prompt={prompt} onDelete={setDeleting} />
              ))}
            </List>
          )}
        </PromptSection>

        <PromptSection
          title="Built-in prompts"
          description="The prompts AISysRev screens with by default. They can't be changed, but you can duplicate them."
          icon={<LockOutlinedIcon fontSize="small" color="action" />}
          index={1}
        >
          {prompts === null ? (
            <RowsSkeleton />
          ) : (
            <List disablePadding>
              {builtIn.map((prompt) => (
                <PromptRow key={prompt.uuid} prompt={prompt} />
              ))}
            </List>
          )}
        </PromptSection>
      </Stack>

      <ConfirmationModal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Delete prompt?"
        description={`"${deleting?.name ?? ""}" will no longer be offered for new tasks. Tasks that already ran with it keep their record of it.`}
        confirmButtonLabel="Delete"
        confirmColor="error"
        confirmButtonIcon={<DeleteOutlinedIcon />}
        confirmButtonTestId="confirm-delete-prompt"
      />
    </Layout>
  );
};
