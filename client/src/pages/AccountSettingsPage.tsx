import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useLocation } from "wouter";
import { ConfirmationModal } from "../components/ConfirmationModal";
import { Layout } from "../components/Layout";
import { riseIn } from "../components/motion";
import { NavTabs } from "../components/NavTabs";
import { ToggleSwitch } from "../components/ToggleSwitch";
import { api } from "../services/api";
import { SETTINGS_TABS } from "./settingsTabs";

type SectionProps = {
  title: string;
  description: string;
  /** Marks a section whose action can't be undone. */
  danger?: boolean;
  action: React.ReactNode;
  /** Its place in the page's stagger of blocks rising in. */
  index: number;
};

const Section: React.FC<SectionProps> = ({ title, description, danger = false, action, index }) => (
  <Paper
    variant="outlined"
    component="section"
    sx={{
      borderRadius: 2,
      p: 3,
      display: "flex",
      flexDirection: { xs: "column", sm: "row" },
      alignItems: { xs: "stretch", sm: "center" },
      gap: 2,
      ...(danger && { borderColor: "error.light" }),
      ...riseIn(index),
    }}
  >
    <Box sx={{ flex: 1 }}>
      <Typography variant="h6" component="h2" color={danger ? "error" : undefined}>
        {title}
      </Typography>
      <Typography variant="body2" color="textSecondary">
        {description}
      </Typography>
    </Box>
    <Box sx={{ flexShrink: 0 }}>{action}</Box>
  </Paper>
);

export const AccountSettingsPage = () => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [researchConsent, setResearchConsent] = useState<boolean>(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [saving, setSaving] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    const controller = new AbortController();
    const fetchUser = async () => {
      try {
        const res = await api.get("/api/v1/auth/me", { overrides: { signal: controller.signal } });
        setResearchConsent(res.consent_anonymized_research_usage ?? false);
        setLoadingUser(false);
      } catch (e) {
        if (!controller.signal.aborted) throw e;
      }
    };
    fetchUser();
    return () => controller.abort();
  }, []);

  const handleSaveResearchConsent = useCallback(async () => {
    const newValue = !researchConsent;
    setSaving(true);
    try {
      await api.patch("/api/v1/auth/me/research-consent", { body: { research: newValue } });
      setResearchConsent(newValue);
      toast.success("Research consent updated.");
    } catch {
      toast.error("Failed to update research consent. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [researchConsent]);

  const handleDeleteAccount = async () => {
    await api.delete("/api/v1/auth/me");
    navigate("/login");
  };

  return (
    <Layout title="Settings">
      <NavTabs aria-label="Settings sections" active="/settings/account" tabs={SETTINGS_TABS} />
      <Stack spacing={3} sx={{ maxWidth: 960 }}>
        <Section
          index={0}
          title="Research data consent"
          description="I consent to my anonymized usage data being used for academic research about this tool. This is optional and will not affect your use of the application. You can change your consent at any time."
          action={
            loadingUser ? (
              <Skeleton variant="rounded" width={58} height={38} />
            ) : (
              <ToggleSwitch
                checked={researchConsent}
                disabled={saving}
                inputLabel="Research data consent"
                testId="research-consent-switch"
                onChange={handleSaveResearchConsent}
              />
            )
          }
        />
        <Section
          index={1}
          danger
          title="Delete account"
          description="Permanently deletes your account and all your projects, papers and jobs. This cannot be undone."
          action={
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteOutlinedIcon />}
              onClick={() => setShowDeleteModal(true)}
              data-testid="delete-account-button"
            >
              Delete account
            </Button>
          }
        />
      </Stack>
      <ConfirmationModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        title="Delete account?"
        description="All your projects, papers and jobs will be permanently deleted. This cannot be undone."
        confirmButtonLabel="Delete account"
        confirmColor="error"
        confirmButtonIcon={<DeleteOutlinedIcon />}
        confirmButtonTestId="confirm-delete-account-button"
      />
    </Layout>
  );
};
