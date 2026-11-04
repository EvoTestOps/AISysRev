import HistoryIcon from "@mui/icons-material/History";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import RestoreIcon from "@mui/icons-material/Restore";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Link, useLocation, useParams } from "wouter";
import { Layout } from "../../components/Layout";
import {
  createPrompt,
  fetchPrompt,
  fetchPromptVariables,
  fetchPrompts,
  promptErrorMessage,
  savePromptVersion,
} from "../../services/promptService";
import { JobPromptingType, ScreeningTarget } from "../../state/types";
import {
  PROMPT_TYPES,
  PromptDetail,
  PromptType,
  PromptVariable,
  PromptVariables,
  PromptVersion,
} from "../../state/types/prompt";
import {
  PROMPT_TYPE_LABELS,
  SCREENING_TARGET_LABELS,
  findDefaultPrompt,
  formatPromptDate,
} from "./promptLabels";
import { validateTemplate } from "./promptTemplate";
import { PromptTemplateEditor } from "./PromptTemplateEditor";

const PROMPTS_PARENT = { label: "Prompts", href: "/prompts" };
// The system prompt takes no variables; one array so its editor isn't reconfigured on every render.
const NO_VARIABLES: PromptVariable[] = [];

type Draft = {
  name: string;
  description: string;
  promptingType: PromptType;
  screeningTarget: ScreeningTarget;
  systemPrompt: string;
  userPrompt: string;
};

const draftFrom = (prompt: PromptDetail): Draft => ({
  name: prompt.name,
  description: prompt.description ?? "",
  promptingType: prompt.prompting_type,
  screeningTarget: prompt.screening_target,
  systemPrompt: prompt.versions[0].system_prompt,
  userPrompt: prompt.versions[0].user_prompt,
});

/** A new prompt starts from the built-in one of its type, which is easier to adapt than an empty page. */
const builtInText = async (promptingType: PromptType, screeningTarget: ScreeningTarget) => {
  const base = findDefaultPrompt(await fetchPrompts(), promptingType, screeningTarget);
  return {
    systemPrompt: base?.latest_version.system_prompt ?? "",
    userPrompt: base?.latest_version.user_prompt ?? "",
  };
};

/**
 * Creates a prompt, or shows and edits one. Built-in prompts are read-only.
 * Saving a changed text adds a version; older versions stay viewable.
 */
export const PromptEditorPage = () => {
  const { promptUuid } = useParams<{ promptUuid?: string }>();
  const [, navigate] = useLocation();
  const isNew = promptUuid === undefined;

  const [variables, setVariables] = useState<PromptVariables | null>(null);
  const [prompt, setPrompt] = useState<PromptDetail | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  // The built-in text a new prompt was started from, to tell whether it has been edited.
  const [startingText, setStartingText] = useState<string | null>(null);
  const [viewing, setViewing] = useState<PromptVersion | null>(null);
  const [changeNote, setChangeNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetchPromptVariables()
      .then(setVariables)
      .catch((e) => {
        console.error("Fetching prompt variables failed", e);
        toast.error("Could not load the prompt variables.");
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setViewing(null);
    setChangeNote("");
    const load = async () => {
      try {
        if (!isNew) {
          const detail = await fetchPrompt(promptUuid);
          if (cancelled) return;
          setPrompt(detail);
          setDraft(draftFrom(detail));
          return;
        }
        const text = await builtInText(JobPromptingType.ZERO_SHOT, ScreeningTarget.PAPER);
        if (cancelled) return;
        setPrompt(null);
        setDraft({
          name: "",
          description: "",
          promptingType: JobPromptingType.ZERO_SHOT,
          screeningTarget: ScreeningTarget.PAPER,
          ...text,
        });
        setStartingText(text.userPrompt);
      } catch (e) {
        console.error("Fetching the prompt failed", e);
        if (!cancelled) setNotFound(true);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isNew, promptUuid]);

  const locked = prompt?.is_default === true || prompt?.archived === true;
  const readOnly = locked || viewing !== null;
  const shown: Draft | null = useMemo(
    () =>
      draft && viewing
        ? { ...draft, systemPrompt: viewing.system_prompt, userPrompt: viewing.user_prompt }
        : draft,
    [draft, viewing],
  );

  const typeVariables = variables?.types.find((t) => t.prompting_type === draft?.promptingType);
  const allowedVariables = useMemo(
    () => variables?.variables.filter((v) => typeVariables?.allowed.includes(v.name)) ?? [],
    [variables, typeVariables],
  );
  const issues = useMemo(
    () =>
      typeVariables && shown
        ? validateTemplate(typeVariables, shown.systemPrompt, shown.userPrompt)
        : [],
    [typeVariables, shown],
  );

  const latest = prompt?.versions[0];
  const dirty =
    isNew ||
    (!!draft &&
      !!latest &&
      (draft.systemPrompt !== latest.system_prompt || draft.userPrompt !== latest.user_prompt));
  const nameMissing = !draft?.name.trim();

  const update = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  // Changing a new prompt's type or target swaps in its built-in text, unless it has been edited.
  const changeKind = async (patch: Partial<Pick<Draft, "promptingType" | "screeningTarget">>) => {
    if (!draft) return;
    const next = { ...draft, ...patch };
    update(patch);
    if (draft.userPrompt !== startingText) return;
    try {
      const text = await builtInText(next.promptingType, next.screeningTarget);
      update({ ...patch, ...text });
      setStartingText(text.userPrompt);
    } catch (e) {
      console.error("Fetching the built-in prompts failed", e);
    }
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    const text = {
      system_prompt: draft.systemPrompt,
      user_prompt: draft.userPrompt,
      change_note: changeNote.trim() || null,
    };
    try {
      if (isNew) {
        const created = await createPrompt({
          ...text,
          name: draft.name.trim(),
          description: draft.description.trim() || null,
          prompting_type: draft.promptingType,
          screening_target: draft.screeningTarget,
        });
        toast.success(`Created "${created.name}".`);
        navigate(`/prompts/${created.uuid}`, { replace: true });
        return;
      }
      const detail = await savePromptVersion((prompt as PromptDetail).uuid, text);
      setPrompt(detail);
      setDraft(draftFrom(detail));
      setChangeNote("");
      toast.success(`Saved as version ${detail.versions[0].version}.`);
    } catch (e) {
      toast.error(promptErrorMessage(e, "Could not save the prompt."));
    } finally {
      setSaving(false);
    }
  };

  if (notFound) {
    return (
      <Layout title="Prompt not found" parent={PROMPTS_PARENT}>
        <Alert severity="warning">
          This prompt doesn't exist, or it isn't yours. <Link href="/prompts">Back to prompts</Link>
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout
      title={isNew ? "New prompt" : (prompt?.name ?? "")}
      parent={PROMPTS_PARENT}
      loading={!isNew && !prompt}
    >
      {!draft || !variables || !shown ? (
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={56} />
          <Skeleton variant="rounded" height={320} />
        </Stack>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 280px" },
            gap: 3,
            alignItems: "start",
          }}
        >
          <Stack spacing={2.5} sx={{ minWidth: 0 }}>
            {prompt?.archived && (
              <Alert severity="warning">
                This prompt has been deleted. Tasks that used it still show it here.
              </Alert>
            )}

            <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
              {isNew ? (
                <Stack spacing={2.5}>
                  <TextField
                    label="Name"
                    required
                    fullWidth
                    value={draft.name}
                    onChange={(e) => update({ name: e.target.value })}
                    error={nameMissing}
                    slotProps={{ htmlInput: { maxLength: 255 } }}
                  />
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                      select
                      fullWidth
                      label="Prompting strategy"
                      value={draft.promptingType}
                      onChange={(e) => changeKind({ promptingType: e.target.value as PromptType })}
                      helperText={PROMPT_TYPE_LABELS[draft.promptingType].description}
                    >
                      {PROMPT_TYPES.map((t) => (
                        <MenuItem key={t} value={t}>
                          {PROMPT_TYPE_LABELS[t].label}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      select
                      fullWidth
                      label="Screens"
                      value={draft.screeningTarget}
                      onChange={(e) =>
                        changeKind({ screeningTarget: e.target.value as ScreeningTarget })
                      }
                    >
                      {Object.values(ScreeningTarget).map((t) => (
                        <MenuItem key={t} value={t}>
                          {SCREENING_TARGET_LABELS[t]}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>
                  <TextField
                    label="Description"
                    fullWidth
                    multiline
                    value={draft.description}
                    onChange={(e) => update({ description: e.target.value })}
                    slotProps={{ htmlInput: { maxLength: 2000 } }}
                  />
                </Stack>
              ) : (
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
                    {prompt?.is_default && (
                      <Chip size="small" icon={<LockOutlinedIcon />} label="Built-in" />
                    )}
                    <Chip size="small" label={PROMPT_TYPE_LABELS[draft.promptingType].label} />
                    <Chip
                      size="small"
                      variant="outlined"
                      label={SCREENING_TARGET_LABELS[draft.screeningTarget]}
                    />
                  </Stack>
                  {draft.description && <Typography>{draft.description}</Typography>}
                  <Typography variant="body2" color="textSecondary">
                    {PROMPT_TYPE_LABELS[draft.promptingType].description}
                    {prompt?.is_default &&
                      " Built-in prompts can't be changed: create a new prompt to start from this one."}
                  </Typography>
                </Stack>
              )}
            </Paper>

            <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
              <Stack spacing={3}>
                {viewing && (
                  <Alert
                    severity="info"
                    icon={<HistoryIcon />}
                    action={
                      <Stack direction="row" spacing={1}>
                        {!locked && (
                          <Button
                            size="small"
                            startIcon={<RestoreIcon />}
                            onClick={() => {
                              update({
                                systemPrompt: viewing.system_prompt,
                                userPrompt: viewing.user_prompt,
                              });
                              setChangeNote(`Restored version ${viewing.version}`);
                              setViewing(null);
                            }}
                          >
                            Restore
                          </Button>
                        )}
                        <Button size="small" onClick={() => setViewing(null)}>
                          Back to latest
                        </Button>
                      </Stack>
                    }
                  >
                    Viewing version {viewing.version} from {formatPromptDate(viewing.created_at)}.
                  </Alert>
                )}
                <PromptTemplateEditor
                  label="System prompt"
                  value={shown.systemPrompt}
                  onChange={(systemPrompt) => update({ systemPrompt })}
                  variables={NO_VARIABLES}
                  readOnly={readOnly}
                  minRows={2}
                  helperText="Sets the model's role. Plain text: variables are only filled in in the user prompt. Some providers, such as Jev, don't use it."
                  error={issues.some((i) => i.message.startsWith("The system prompt"))}
                  testId="system-prompt-editor"
                />
                <PromptTemplateEditor
                  label="User prompt"
                  value={shown.userPrompt}
                  onChange={(userPrompt) => update({ userPrompt })}
                  variables={allowedVariables}
                  required={typeVariables?.required}
                  readOnly={readOnly}
                  minRows={16}
                  error={issues.some((i) => i.kind === "error")}
                  testId="user-prompt-editor"
                />
                {issues.length > 0 && (
                  <Alert severity={issues.some((i) => i.kind === "error") ? "error" : "warning"}>
                    <Box component="ul" sx={{ m: 0, pl: 2 }}>
                      {issues.map((issue) => (
                        <li key={issue.message}>{issue.message}</li>
                      ))}
                    </Box>
                  </Alert>
                )}
              </Stack>
            </Paper>

            {!readOnly && (
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  alignItems: { xs: "stretch", sm: "center" },
                  gap: 2,
                }}
              >
                <TextField
                  size="small"
                  label="Change note (optional)"
                  placeholder={isNew ? "e.g. First draft" : "What changed in this version?"}
                  value={changeNote}
                  onChange={(e) => setChangeNote(e.target.value)}
                  disabled={!dirty}
                  sx={{ flex: 1 }}
                  slotProps={{ htmlInput: { maxLength: 500 } }}
                />
                <Typography variant="caption" color="textSecondary">
                  {dirty
                    ? `Saves as version ${(latest?.version ?? 0) + 1}.`
                    : "No unsaved changes."}
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<SaveOutlinedIcon />}
                  disabled={!dirty || saving || nameMissing || issues.length > 0}
                  onClick={save}
                >
                  {isNew ? "Create prompt" : "Save"}
                </Button>
              </Paper>
            )}
          </Stack>

          {prompt && (
            <Paper
              variant="outlined"
              sx={{ borderRadius: 2, position: { md: "sticky" }, top: { md: 24 } }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", px: 2, pt: 1.5 }}>
                <HistoryIcon fontSize="small" color="action" />
                <Typography variant="subtitle2">Versions</Typography>
              </Stack>
              <List dense>
                {prompt.versions.map((version, i) => (
                  <ListItemButton
                    key={version.uuid}
                    selected={viewing ? viewing.uuid === version.uuid : i === 0}
                    onClick={() => setViewing(i === 0 ? null : version)}
                  >
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                          <span>Version {version.version}</span>
                          {i === 0 && <Chip label="Latest" size="small" color="primary" />}
                        </Stack>
                      }
                      secondary={`${formatPromptDate(version.created_at)}${version.change_note ? ` · ${version.change_note}` : ""}`}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          )}
        </Box>
      )}
    </Layout>
  );
};
