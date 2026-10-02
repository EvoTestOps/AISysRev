import { CircleStop, Trash2 } from "lucide-react";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import { JobActions } from "./useJobActions";

export const JobActionModals: React.FC<{ actions: JobActions }> = ({ actions }) => (
  <>
    {actions.jobToCancel && (
      <ConfirmationModal
        open={true}
        onClose={actions.dismissCancel}
        onConfirm={actions.confirmCancel}
        title="Cancel screening task?"
        description="This will cancel running and scheduled screening jobs."
        confirmButtonLabel="Cancel task"
        confirmButtonVariant="yellow"
        confirmButtonIcon={<CircleStop size={16} />}
      />
    )}
    {actions.jobToDelete && (
      <ConfirmationModal
        open={true}
        onClose={actions.dismissDelete}
        onConfirm={actions.confirmDelete}
        title="Delete screening task?"
        description="This action cannot be undone. All data related to this task will be permanently deleted."
        confirmButtonLabel="Delete"
        confirmButtonVariant="red"
        confirmButtonIcon={<Trash2 size={16} />}
      />
    )}
  </>
);
