import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
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
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Link, useLocation, useParams, useSearch } from "wouter";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import { Layout } from "../../components/Layout";
import {
  createPrompt,
  deletePrompt,
  fetchPrompt,
  fetchPromptVariables,
  fetchPrompts,
  promptErrorMessage,
  savePromptVersion,
  updatePrompt,
} from "../../services/promptService";
import { JobPromptingType, ScreeningTarget } from "../../state/types";
import {
  PROMPT_TYPES,
  PromptDetail,
  PromptSource,
  PromptType,
  PromptVariables,
  PromptVersion,
} from "../../state/types/prompt";
import {
  PROMPT_TYPE_LABELS,
  SCREENING_TARGET_LABELS,
  findDefaultPrompt,
  formatPromptDate,
} from "./promptLabels";
import { renderTemplate, validateTemplate } from "./promptTemplate";
import { PromptSourceNotice } from "./PromptSource";
import { PromptTemplateEditor } from "./PromptTemplateEditor";

const PROMPTS_PARENT = { label: "Prompts", href: "/prompts" };

type Draft = {
  name: string;
  description: string;
  promptingType: PromptType;
  screeningTarget: ScreeningTarget;
  systemPrompt: string;
  userPrompt: string;
};

const draftFrom = (prompt: PromptDetail, version: PromptVersion): Draft => ({
  name: prompt.name,
  description: prompt.description ?? "",
  promptingType: prompt.prompting_type,
  screeningTarget: prompt.screening_target,
  systemPrompt: version.system_prompt,
  userPrompt: version.user_prompt,
});

type VersionListProps = {
  versions: PromptVersion[];
  viewing: PromptVersion | null;
  onView: (version: PromptVersion | null) => void;
};

/** Every saved version, newest first; picking one shows it read-only. */
const VersionList: React.FC<VersionListProps> = ({ versions, viewing, onView }) => (
  <Paper variant="outlined" sx={{ borderRadius: 2 }} data-testid="prompt-versions">
    <Stack direction="row" spacing={1} sx={{ alignItems: "center", px: 2, pt: 1.5 }}>
      <HistoryIcon fontSize="small" color="action" />
      <Typography variant="subtitle2">Versions</Typography>
    </Stack>
    <List dense>
      {versions.map((version, i) => {
        const isLatest = i === 0;
        const selected = viewing ? viewing.uuid === version.uuid : isLatest;
        return (
          <ListItemButton
            key={version.uuid}
            selected={selected}
            onClick={() => onView(isLatest ? null : version)}
            data-testid={`prompt-version-${version.version}`}
          >
            <ListItemText
              primary={
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <span>Version {version.version}</span>
                  {isLatest && <Chip label="Latest" size="small" color="primary" />}
                </Stack>
              }
              secondary={
                <>
                  {formatPromptDate(version.created_at)}
                  {version.change_note && ` · ${version.change_note}`}
                </>
              }
            />
          </ListItemButton>
        );
      })}
    </List>
  </Paper>
);

/** The prompt as the model would get it, filled in with example values. */
const PromptPreview: React.FC<{ draft: Draft; variables: PromptVariables }> = ({
  draft,
  variables,
}) => {
  const examples = useMemo(
    () => Object.fromEntries(variables.variables.map((v) => [v.name, v.example])),
    [variables],
  );
  const block = (title: string, text: string, testId: string) => (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      <Paper
        variant="outlined"
        component="pre"
        data-testid={testId}
        sx={{
          m: 0,
          p: 1.5,
          borderRadius: 1,
          bgcolor: "grey.50",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          fontSize: 13,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {text || "(empty)"}
      </Paper>
    </Box>
  );
  return (
    <Stack spacing={2}>
      <Alert severity="info" variant="outlined">
        Filled in with example values. In a task, each paper's own title, abstract and your
        project's criteria are used.
      </Alert>
      {block("System prompt", draft.systemPrompt, "prompt-preview-system")}
      {block("User prompt", renderTemplate(draft.userPrompt, examples), "prompt-preview-user")}
    </Stack>
  );
};

/**
 * Creates a prompt, or shows and edits one. Built-in prompts are read-only.
 * Saving a changed text adds a version; older versions stay viewable.
 */
export const PromptEditorPage = () => {
  const { promptUuid } = useParams<{ promptUuid?: string }>();
  const search = useSearch();
  const [, navigate] = useLocation();
  const isNew = promptUuid === undefined;
  const duplicateFrom = new URLSearchParams(search).get("from");

  const [variables, setVariables] = useState<PromptVariables | null>(null);
  const [prompt, setPrompt] = useState<PromptDetail | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  // The text a new prompt was started from, to tell whether it has been edited.
  const [startingText, setStartingText] = useState<string | null>(null);
  // The publication of the built-in prompt a duplicate was started from.
  const [duplicatedSource, setDuplicatedSource] = useState<PromptSource | null>(null);
  const [viewing, setViewing] = useState<PromptVersion | null>(null);
  const [changeNote, setChangeNote] = useState("");
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetchPromptVariables()
      .then(setVariables)
      .catch((e) => {
        console.error("Fetching prompt variables failed", e);
        toast.error("Could not load the prompt variables.");
      });
  }, []);

  // Load the prompt, or the starting point of a new one.
  useEffect(() => {
    let cancelled = false;
    setViewing(null);
    setChangeNote("");
    setDuplicatedSource(null);
    const load = async () => {
      try {
        if (!isNew) {
          const detail = await fetchPrompt(promptUuid);
          if (cancelled) return;
          setPrompt(detail);
          setDraft(draftFrom(detail, detail.versions[0]));
          return;
        }
        setPrompt(null);
        if (duplicateFrom) {
          const source = await fetchPrompt(duplicateFrom);
          if (cancelled) return;
          setDraft({
            ...draftFrom(source, source.versions[0]),
            name: `${source.name} (copy)`,
          });
          setStartingText(null);
          // A copy of a later version of a published prompt isn't the published text.
          setDuplicatedSource(
            source.source?.version === source.versions[0].version ? source.source : null,
          );
          return;
        }
        // A blank prompt starts from the built-in one of its type, which is
        // easier to adapt than an empty page.
        const all = await fetchPrompts();
        if (cancelled) return;
        const base = findDefaultPrompt(all, JobPromptingType.ZERO_SHOT, ScreeningTarget.PAPER);
        const userPrompt = base?.latest_version.user_prompt ?? "";
        setDraft({
          name: "",
          description: "",
          promptingType: JobPromptingType.ZERO_SHOT,
          screeningTarget: ScreeningTarget.PAPER,
          systemPrompt: base?.latest_version.system_prompt ?? "",
          userPrompt,
        });
        setStartingText(userPrompt);
      } catch (e) {
        console.error("Fetching the prompt failed", e);
        if (!cancelled) setNotFound(true);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isNew, promptUuid, duplicateFrom]);

  const readOnly = prompt?.is_default === true || prompt?.archived === true || viewing !== null;
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
  const textChanged =
    !!draft &&
    (!latest ||
      draft.systemPrompt !== latest.system_prompt ||
      draft.userPrompt !== latest.user_prompt);
  const detailsChanged =
    !!draft &&
    !!prompt &&
    (draft.name.trim() !== prompt.name || draft.description !== (prompt.description ?? ""));
  const dirty = isNew || textChanged || detailsChanged;
  const nameMissing = !draft?.name.trim();

  const update = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  // A new prompt's type or target changes which built-in prompt it starts from,
  // as long as the user hasn't started editing that text.
  const changeKind = async (patch: Partial<Pick<Draft, "promptingType" | "screeningTarget">>) => {
    if (!draft) return;
    const next = { ...draft, ...patch };
    update(patch);
    if (startingText === null || draft.userPrompt !== startingText) return;
    try {
      const all = await fetchPrompts();
      const base = findDefaultPrompt(all, next.promptingType, next.screeningTarget);
      if (base) {
        update({ ...patch, userPrompt: base.latest_version.user_prompt });
        setStartingText(base.latest_version.user_prompt);
      }
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
      let detail = prompt as PromptDetail;
      if (detailsChanged) {
        detail = await updatePrompt(detail.uuid, {
          name: draft.name.trim(),
          description: draft.description.trim() || null,
        });
      }
      if (textChanged) {
        detail = await savePromptVersion(detail.uuid, text);
      }
      setPrompt(detail);
      setDraft(draftFrom(detail, detail.versions[0]));
      setChangeNote("");
      toast.success(textChanged ? `Saved as version ${detail.versions[0].version}.` : "Saved.");
    } catch (e) {
      toast.error(promptErrorMessage(e, "Could not save the prompt."));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!prompt) return;
    setConfirmDelete(false);
    try {
      await deletePrompt(prompt.uuid);
      toast.success(`Deleted "${prompt.name}".`);
      navigate("/prompts");
    } catch (e) {
      toast.error(promptErrorMessage(e, "Could not delete the prompt."));
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

  const title = isNew ? (duplicateFrom ? "Duplicate prompt" : "New prompt") : (prompt?.name ?? "");
  const loading = !draft || !variables || !shown;
  const errors = issues.filter((i) => i.kind === "error");
  const missing = issues.filter((i) => i.kind === "missing");

  return (
    <Layout
      title={title}
      parent={PROMPTS_PARENT}
      loading={!isNew && !prompt}
      headerActions={
        prompt && (
          <>
            <Button
              startIcon={<ContentCopyOutlinedIcon />}
              component={Link}
              href={`/prompts/new?from=${prompt.uuid}`}
              data-testid="duplicate-prompt-button"
            >
              {prompt.is_default ? "Duplicate to edit" : "Duplicate"}
            </Button>
            {!prompt.is_default && !prompt.archived && (
              <Button
                color="error"
                startIcon={<DeleteOutlinedIcon />}
                onClick={() => setConfirmDelete(true)}
                data-testid="delete-prompt-button"
              >
                Delete
              </Button>
            )}
          </>
        )
      }
    >
      {loading ? (
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
            {prompt?.source && (
              <PromptSourceNotice
                source={prompt.source}
                version={(viewing ?? prompt.versions[0]).version}
              />
            )}
            {duplicatedSource && (
              <Alert severity="info" variant="outlined" data-testid="duplicated-source-notice">
                This copy starts from the prompt published in {duplicatedSource.label}. If you
                change its text, it is no longer the published prompt.
              </Alert>
            )}
            {prompt?.archived && (
              <Alert severity="warning">
                This prompt has been deleted. Tasks that used it still show it here.
              </Alert>
            )}

            <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
              {prompt && (prompt.is_default || prompt.archived) ? (
                // Built-in and deleted prompts can't be changed: show their details as
                // text instead of disabled fields.
                <Stack spacing={1.5} data-testid="prompt-details">
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}
                  >
                    <Chip size="small" label={PROMPT_TYPE_LABELS[draft.promptingType].label} />
                    <Chip
                      size="small"
                      variant="outlined"
                      label={SCREENING_TARGET_LABELS[draft.screeningTarget]}
                    />
                    {prompt.is_default && (
                      <Chip
                        size="small"
                        variant="outlined"
                        icon={<LockOutlinedIcon />}
                        label="Built-in"
                      />
                    )}
                  </Stack>
                  {draft.description && <Typography>{draft.description}</Typography>}
                  <Typography variant="body2" color="textSecondary">
                    {PROMPT_TYPE_LABELS[draft.promptingType].description}
                    {prompt.is_default &&
                      " Built-in prompts can't be changed: duplicate this one to make your own version."}
                  </Typography>
                </Stack>
              ) : (
                <Stack spacing={2.5}>
                  <TextField
                    label="Name"
                    required
                    fullWidth
                    value={draft.name}
                    onChange={(e) => update({ name: e.target.value })}
                    error={nameMissing}
                    slotProps={{
                      htmlInput: { maxLength: 255, "data-testid": "prompt-name-input" },
                    }}
                  />
                  {isNew ? (
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                      <TextField
                        select
                        fullWidth
                        label="Prompting strategy"
                        value={draft.promptingType}
                        onChange={(e) =>
                          changeKind({ promptingType: e.target.value as PromptType })
                        }
                        helperText={PROMPT_TYPE_LABELS[draft.promptingType].description}
                        slotProps={{
                          select: {
                            SelectDisplayProps: { "data-testid": "prompt-type-select" } as object,
                          },
                        }}
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
                  ) : (
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}
                    >
                      <Chip size="small" label={PROMPT_TYPE_LABELS[draft.promptingType].label} />
                      <Chip
                        size="small"
                        variant="outlined"
                        label={SCREENING_TARGET_LABELS[draft.screeningTarget]}
                      />
                      <Typography variant="caption" color="textSecondary">
                        {PROMPT_TYPE_LABELS[draft.promptingType].description} Fixed once the prompt
                        is created.
                      </Typography>
                    </Stack>
                  )}
                  <TextField
                    label="Description"
                    fullWidth
                    multiline
                    minRows={1}
                    value={draft.description}
                    onChange={(e) => update({ description: e.target.value })}
                    slotProps={{ htmlInput: { maxLength: 2000 } }}
                  />
                </Stack>
              )}
            </Paper>

            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
              <Tabs
                value={tab}
                onChange={(_, value) => setTab(value)}
                sx={{ minHeight: 0, px: { xs: 1, sm: 2 }, borderBottom: 1, borderColor: "divider" }}
              >
                <Tab label="Edit" value="edit" data-testid="prompt-edit-tab" />
                <Tab label="Preview" value="preview" data-testid="prompt-preview-tab" />
              </Tabs>
              <Stack spacing={2.5} sx={{ p: { xs: 2, sm: 3 } }}>
                {viewing && (
                  <Alert
                    severity="info"
                    icon={<HistoryIcon />}
                    action={
                      <Stack direction="row" spacing={1}>
                        {!prompt?.is_default && !prompt?.archived && (
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
                            data-testid="restore-version-button"
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

                {tab === "edit" ? (
                  <Stack spacing={3}>
                    <PromptTemplateEditor
                      label="System prompt"
                      value={shown.systemPrompt}
                      onChange={(systemPrompt) => update({ systemPrompt })}
                      variables={[]}
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
                      error={errors.length > 0}
                      testId="user-prompt-editor"
                    />
                    {issues.length > 0 && (
                      <Alert
                        severity={errors.length > 0 ? "error" : "warning"}
                        data-testid="prompt-issues"
                      >
                        <Box component="ul" sx={{ m: 0, pl: 2 }}>
                          {[...errors, ...missing].map((issue) => (
                            <li key={issue.message}>{issue.message}</li>
                          ))}
                        </Box>
                      </Alert>
                    )}
                  </Stack>
                ) : (
                  <PromptPreview draft={shown} variables={variables} />
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
                {(isNew || textChanged) && (
                  <TextField
                    size="small"
                    label="Change note (optional)"
                    placeholder={isNew ? "e.g. First draft" : "What changed in this version?"}
                    value={changeNote}
                    onChange={(e) => setChangeNote(e.target.value)}
                    sx={{ flex: 1 }}
                    slotProps={{
                      htmlInput: { maxLength: 500, "data-testid": "change-note-input" },
                    }}
                  />
                )}
                <Box sx={{ flex: isNew || textChanged ? "none" : 1 }}>
                  <Typography variant="caption" color="textSecondary">
                    {issues.length > 0
                      ? "Fix the problems above to save."
                      : isNew
                        ? "Saved as version 1."
                        : textChanged
                          ? `Saves as version ${(latest?.version ?? 0) + 1}.`
                          : dirty
                            ? "Renaming doesn't create a new version."
                            : "No unsaved changes."}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<SaveOutlinedIcon />}
                  disabled={!dirty || saving || nameMissing || issues.length > 0}
                  onClick={save}
                  data-testid="save-prompt-button"
                >
                  {isNew ? "Create prompt" : "Save"}
                </Button>
              </Paper>
            )}
          </Stack>

          {prompt && (
            <Box sx={{ position: { md: "sticky" }, top: { md: 24 } }}>
              <VersionList versions={prompt.versions} viewing={viewing} onView={setViewing} />
            </Box>
          )}
        </Box>
      )}

      <ConfirmationModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        title="Delete prompt?"
        description={`"${prompt?.name ?? ""}" will no longer be offered for new tasks. Tasks that already ran with it keep their record of it.`}
        confirmButtonLabel="Delete"
        confirmColor="error"
        confirmButtonIcon={<DeleteOutlinedIcon />}
        confirmButtonTestId="confirm-delete-prompt"
      />
    </Layout>
  );
};
