import AddIcon from "@mui/icons-material/Add";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Link } from "wouter";
import { ConfirmationModal } from "../components/ConfirmationModal";
import { Layout } from "../components/Layout";
import { deletePrompt, fetchPrompts, promptErrorMessage } from "../services/promptService";
import type { Prompt } from "../state/types/prompt";
import {
  PROMPT_TYPE_LABELS,
  SCREENING_TARGET_LABELS,
  formatPromptDate,
} from "./prompts/promptLabels";

/** The built-in prompts and the account's own, shared by all its projects. */
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

  return (
    <Layout
      title="Prompts"
      headerActions={
        <Button variant="contained" startIcon={<AddIcon />} component={Link} href="/prompts/new">
          New prompt
        </Button>
      }
    >
      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <List disablePadding>
          {prompts === null
            ? [0, 1, 2].map((i) => (
                <ListItem key={i} divider>
                  <ListItemText primary={<Skeleton width={220} />} secondary={<Skeleton />} />
                </ListItem>
              ))
            : prompts.map((prompt) => (
                <ListItem
                  key={prompt.uuid}
                  divider
                  disablePadding
                  secondaryAction={
                    !prompt.is_default && (
                      <Tooltip title="Delete">
                        <IconButton
                          aria-label={`Delete ${prompt.name}`}
                          onClick={() => setDeleting(prompt)}
                        >
                          <DeleteOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )
                  }
                >
                  <ListItemButton component={Link} href={`/prompts/${prompt.uuid}`}>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                          <span>{prompt.name}</span>
                          {prompt.is_default && (
                            <Chip size="small" icon={<LockOutlinedIcon />} label="Built-in" />
                          )}
                          <Chip
                            size="small"
                            variant="outlined"
                            label={`${PROMPT_TYPE_LABELS[prompt.prompting_type].label} · ${SCREENING_TARGET_LABELS[prompt.screening_target]}`}
                          />
                        </Stack>
                      }
                      secondary={`${prompt.description ? `${prompt.description} · ` : ""}Version ${prompt.latest_version.version}, updated ${formatPromptDate(prompt.latest_version.created_at)}`}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
        </List>
      </Paper>

      <ConfirmationModal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Delete prompt?"
        description={`"${deleting?.name ?? ""}" will no longer be offered for new tasks. Tasks that already ran with it keep their record of it.`}
        confirmButtonLabel="Delete"
        confirmColor="error"
        confirmButtonIcon={<DeleteOutlinedIcon />}
      />
    </Layout>
  );
};
