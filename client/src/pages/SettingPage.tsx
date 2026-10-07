import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import KeyOutlinedIcon from "@mui/icons-material/KeyOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useEffect, useMemo, useState } from "react";
import * as z from "zod";
import { ConfirmationModal } from "../components/ConfirmationModal";
import { Layout } from "../components/Layout";
import { NavTabs } from "../components/NavTabs";
import { ToggleSwitch } from "../components/ToggleSwitch";
import { useConfig } from "../config/config";
import { SETTINGS_TABS } from "./settingsTabs";

type SettingRowProps = {
  title: string;
  description: string | null;
  loading: boolean;
  /** Next to the title, e.g. a status chip. */
  status?: React.ReactNode;
  /** The row's controls, on the right (below on narrow screens). */
  action: React.ReactNode;
  testId?: string;
};

/** One setting: its title and description, and the controls to change it. */
const SettingRow: React.FC<SettingRowProps> = ({
  title,
  description,
  loading,
  status,
  action,
  testId,
}) => (
  <ListItem
    divider
    data-testid={testId}
    sx={{
      py: 2,
      gap: 2,
      flexDirection: { xs: "column", sm: "row" },
      alignItems: { xs: "stretch", sm: "center" },
    }}
  >
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
        <Typography variant="subtitle2">{loading ? <Skeleton width={160} /> : title}</Typography>
        {!loading && status}
      </Stack>
      <Typography variant="body2" color="text.secondary">
        {loading ? <Skeleton width={260} /> : (description ?? "")}
      </Typography>
    </Box>
    <Box sx={{ flexShrink: 0 }}>{action}</Box>
  </ListItem>
);

type SettingEntryProps = {
  config_key: string;
  title: string;
  description: string | null;
};

/** A secret setting, such as an API key: set, replace or remove it. */
const SettingEntry: React.FC<SettingEntryProps> = ({ title, config_key, description }) => {
  const { setting, loading, refresh, update, remove } = useConfig(config_key);

  const [editMode, setEditMode] = useState(false);
  const [value, setValue] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const isSet = !loading && setting !== null;
  const canSave = !loading && value.trim() !== "" && value !== setting?.value;

  const startEditing = () => {
    setValue("");
    setEditMode(true);
  };
  const cancel = () => {
    refresh();
    setEditMode(false);
    setValue("");
  };
  const save = () => {
    if (!canSave) return;
    update({ value: value.trim() });
    setEditMode(false);
    setValue("");
    refresh();
  };

  const status = (
    <Chip
      size="small"
      variant="outlined"
      color={isSet ? "success" : "warning"}
      label={isSet ? "Key set" : "Not set"}
      data-testid={`setting-status-${config_key}`}
    />
  );

  let action: React.ReactNode = null;
  if (editMode) {
    action = (
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <TextField
          type="password"
          size="small"
          label={title}
          placeholder="Paste or type value…"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          sx={{ width: { xs: "100%", sm: 320 } }}
          slotProps={{
            htmlInput: {
              "data-testid": `setting-value-input-${config_key}`,
              "data-1p-ignore": true,
              autoComplete: "off",
            },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <KeyOutlinedIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <Button
          variant="contained"
          disabled={!canSave}
          onClick={save}
          data-testid={`setting-save-button-${config_key}`}
        >
          Save
        </Button>
        <Button onClick={cancel} data-testid={`setting-cancel-button-${config_key}`}>
          Cancel
        </Button>
      </Stack>
    );
  } else if (setting !== null) {
    action = (
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontFamily: "monospace", letterSpacing: 2 }}
          aria-label="Saved key (hidden)"
        >
          ••••••••
        </Typography>
        <Button
          variant="outlined"
          onClick={startEditing}
          data-testid={`setting-update-button-${config_key}`}
        >
          Update
        </Button>
        <Tooltip title="Remove key">
          <IconButton
            aria-label={`Remove ${title}`}
            onClick={() => setShowDeleteModal(true)}
            data-testid={`setting-delete-button-${config_key}`}
          >
            <DeleteOutlinedIcon />
          </IconButton>
        </Tooltip>
      </Stack>
    );
  } else if (!loading) {
    action = (
      <Button
        variant="outlined"
        onClick={startEditing}
        data-testid={`setting-set-value-button-${config_key}`}
      >
        Set value
      </Button>
    );
  }

  return (
    <>
      <SettingRow
        testId={`setting-entry-${config_key}`}
        title={title}
        description={description}
        loading={loading}
        status={status}
        action={action}
      />
      <ConfirmationModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={async () => {
          await remove();
          setShowDeleteModal(false);
          refresh();
        }}
        title="Remove API key?"
        description={`The ${title} will be deleted. Screening tasks that need it can't run until you set it again.`}
        confirmButtonLabel="Remove"
        confirmColor="error"
        confirmButtonIcon={<DeleteOutlinedIcon />}
        confirmButtonTestId={`setting-confirm-delete-button-${config_key}`}
      />
    </>
  );
};

type SettingToggleEntryProps = {
  config_key: string;
  title: string;
  description: string | null;
  defaultValue: boolean;
};

/** An on/off setting; unset settings show their default. */
const SettingToggleEntry: React.FC<SettingToggleEntryProps> = ({
  title,
  config_key,
  description,
  defaultValue,
}) => {
  const { setting, loading, update } = useConfig(config_key);
  const enabled = (setting?.value ?? String(defaultValue)) === "true";

  return (
    <SettingRow
      title={title}
      description={description}
      loading={loading}
      action={
        loading ? (
          <Skeleton variant="rounded" width={58} height={38} />
        ) : (
          <ToggleSwitch
            checked={enabled}
            inputLabel={title}
            testId={`setting_${config_key}_toggle`}
            onChange={(checked) => update({ value: checked ? "true" : "false", secret: false })}
          />
        )
      }
    />
  );
};

const ConfigParameterSchema = z.object({
  key: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  type: z.enum(["string", "number", "boolean"]).default("string"),
  defaultValue: z.union([z.string(), z.number(), z.boolean()]).nullable().optional(),
  secret: z.boolean(),
});

const ProviderConfigParamsResponseSchema = z.object({
  title: z.string(),
  description: z.string(),
  config_parameters: z.array(ConfigParameterSchema),
});

const ProviderConfigParamsMapSchema = z.record(z.string(), ProviderConfigParamsResponseSchema);
type ProviderConfigParamsMap = z.infer<typeof ProviderConfigParamsMapSchema>;

export const SettingsPage = () => {
  const [entries, setEntries] = useState<ProviderConfigParamsMap>({});

  useEffect(() => {
    fetch("/api/v1/llm/provider_config_params")
      .then((res) => res.json())
      .then((jsonData) => {
        setEntries(ProviderConfigParamsMapSchema.parse(jsonData));
      })
      .catch();
  }, []);

  const providerKeys = useMemo(
    () => Object.keys(entries).filter((key) => entries[key]?.config_parameters.length),
    [entries],
  );

  return (
    <Layout title="Settings">
      <NavTabs aria-label="Settings sections" active="/settings" tabs={SETTINGS_TABS} />
      <Stack spacing={3} sx={{ maxWidth: 960 }}>
        <Typography variant="body2" color="text.secondary">
          API keys and options for the LLM providers. Keys are stored for your account only.
        </Typography>
        {providerKeys.map((key) => {
          const entry = entries[key];
          return (
            <Paper key={key} variant="outlined" sx={{ borderRadius: 2 }} component="section">
              <Box sx={{ px: 3, pt: 2.5, pb: 1 }}>
                <Typography variant="h6" component="h2">
                  {entry.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {entry.description}
                </Typography>
              </Box>
              <List disablePadding sx={{ px: 1, "& > li:last-of-type": { borderBottom: 0 } }}>
                {entry.config_parameters.map((setting) =>
                  setting.type === "boolean" ? (
                    <SettingToggleEntry
                      key={setting.key}
                      title={setting.title}
                      config_key={setting.key}
                      description={setting.description}
                      defaultValue={Boolean(setting.defaultValue)}
                    />
                  ) : (
                    <SettingEntry
                      key={setting.key}
                      title={setting.title}
                      config_key={setting.key}
                      description={setting.description}
                    />
                  ),
                )}
              </List>
            </Paper>
          );
        })}
      </Stack>
    </Layout>
  );
};
