import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Button from "@mui/material/Button";
import { Link } from "wouter";
import { useConfig } from "../../../config/config";

type ConfigKeyCheckProps = {
  config_key: string;
  title: string;
  should_show: boolean;
};

/** A warning that a setting the provider needs, such as its API key, is missing. */
export const ConfigKeyCheck: React.FC<ConfigKeyCheckProps> = ({
  config_key,
  should_show,
  title,
}) => {
  const { loading, setting } = useConfig(config_key);
  return !loading && setting == null && should_show ? (
    <Alert
      severity="error"
      data-testid={`error-missing-${config_key}`}
      sx={{ borderRadius: 2, alignItems: "center" }}
      action={
        <Button
          component={Link}
          href="/settings"
          color="inherit"
          size="small"
          startIcon={<SettingsOutlinedIcon />}
          sx={{ whiteSpace: "nowrap" }}
        >
          Go to settings
        </Button>
      }
    >
      <AlertTitle sx={{ mb: 0.25 }}>{title} is not set</AlertTitle>
      Tasks with this provider can't run until it is added in settings.
    </Alert>
  ) : null;
};
