import { useState } from "react";
import { useLocation } from "wouter";
import { Trash2 } from "lucide-react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ConfirmationModal } from "../components/ConfirmationModal";
import { Layout } from "../components/Layout";
import { TabButton } from "../components/TabButton";
import { api } from "../services/api";

export const AccountSettingsPage = () => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [, navigate] = useLocation();

  const handleDeleteAccount = async () => {
    await api.delete("/api/v1/auth/me");
    navigate("/login");
  };

  return (
    <Layout title="Settings">
      <div className="flex flex-row mb-4">
        <TabButton href="/settings">LLM Settings</TabButton>
        <TabButton href="/settings/account" active>
          Account
        </TabButton>
      </div>
      <Card>
        <div className="border-b border-slate-200 bg-white px-6 py-5">
          <h1 className="text-xl font-semibold text-slate-900">Account</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage your account settings.
          </p>
        </div>
        <div className="space-y-4 bg-slate-50 px-6 py-6">
          <div className="rounded-2xl border border-red-200 bg-white shadow-sm p-5">
            <p className="text-sm font-semibold text-slate-900">
              Delete account
            </p>
            <p className="mt-1 text-sm text-slate-600 mb-4">
              Permanently deletes your account and all your projects, papers and
              jobs. Note that this action cannot be undone.
            </p>
            <Button
              variant="red"
              size="sm"
              onClick={() => setShowDeleteModal(true)}
            >
              <Trash2 size={16} />
              Delete account
            </Button>
          </div>
        </div>
      </Card>
      <ConfirmationModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        title="Delete account"
        description="Are you sure you want to delete your account? All your projects, papers and jobs will be permanently deleted. This action cannot be undone."
        confirmButtonLabel="Delete account"
        confirmButtonVariant="red"
        confirmButtonIcon={<Trash2 size={16} />}
      />
    </Layout>
  );
};
