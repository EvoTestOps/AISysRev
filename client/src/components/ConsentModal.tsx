import { useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { toast } from "react-toastify";
import { Button } from "./Button";
import { api } from "../services/api";

type ConsentModalProps = {
  open: boolean;
  onAccepted: () => void;
};

export const ConsentModal: React.FC<ConsentModalProps> = ({ open, onAccepted }) => {
  const [terms, setTerms] = useState(false);
  const [privacyPolicy, setPrivacyPolicy] = useState(false);
  const [research, setResearch] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = terms && privacyPolicy && !submitting;

  const handleAccept = async () => {
    setSubmitting(true);
    try {
      await api.post("/api/v1/auth/consent", {
        terms,
        privacy_policy: privacyPolicy,
        research,
      });
      onAccepted();
    } catch {
      toast.error("Failed to save your consent. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => {}}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <DialogPanel className="relative bg-white shadow-2xl rounded-xl w-full max-w-lg p-8 flex flex-col gap-4">
        <DialogTitle className="text-lg font-bold">
          Before you continue
        </DialogTitle>


        <div className="flex flex-col gap-2">
          <label className="flex items-start gap-2 text-sm text-slate-900 cursor-pointer">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="mt-0.5 cursor-pointer"
            />
            <span>
              I agree to the{" "}
              <a href="/terms-and-conditions" target="_blank" rel="noreferrer" className="underline">
                Terms and Conditions
              </a>{" "}
              *
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm text-slate-900 cursor-pointer">
            <input
              type="checkbox"
              checked={privacyPolicy}
              onChange={(e) => setPrivacyPolicy(e.target.checked)}
              className="mt-0.5 cursor-pointer"
            />
            <span>
              I agree to the{" "}
              <a href="/register_and_privacy_policy" target="_blank" rel="noreferrer" className="underline">
                Register and Privacy Policy
              </a>{" "}
              *
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm text-slate-900 cursor-pointer mt-4">
            <input
              type="checkbox"
              checked={research}
              onChange={(e) => setResearch(e.target.checked)}
              className="mt-0.5 cursor-pointer"
            />
            <span>
              I consent to my anonymized usage data being used for academic
              research about this tool.
              <br />
              This is optional and will not affect your use of the application.
              <br />
              You can change this setting in your account settings.
            </span>
          </label>

          <p className="text-xs text-slate-900">* Required</p>
        </div>

        <div className="flex justify-end">
          <Button variant="slate" onClick={handleAccept} disabled={!canSubmit}>
            Accept and continue
          </Button>
        </div>
      </DialogPanel>
    </Dialog>
  );
};
