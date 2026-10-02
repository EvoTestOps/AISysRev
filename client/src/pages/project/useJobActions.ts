import { useCallback, useState } from "react";
import { toast } from "react-toastify";
import { useTypedStoreActions } from "../../state/store";

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Cancelling and deleting screening tasks, each after a confirmation. */
export const useJobActions = (projectUuid: string) => {
  const cancelJob = useTypedStoreActions((actions) => actions.cancelJob);
  const deleteJob = useTypedStoreActions((actions) => actions.deleteJob);
  const [jobToCancel, setJobToCancel] = useState<string | null>(null);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);

  const confirmCancel = useCallback(() => {
    if (!jobToCancel) return;
    cancelJob({ jobUuid: jobToCancel, projectUuid })
      .then(() => {
        toast.success("Task cancelled successfully", { autoClose: 1500 });
        setJobToCancel(null);
      })
      .catch((error: unknown) => toast.error(`Error canceling task: ${errorMessage(error)}`));
  }, [jobToCancel, projectUuid, cancelJob]);

  const confirmDelete = useCallback(() => {
    if (!jobToDelete) return;
    deleteJob({ jobUuid: jobToDelete, projectUuid })
      .then(() => {
        toast.success("Task deleted successfully", { autoClose: 1500 });
        setJobToDelete(null);
      })
      .catch((error: unknown) => toast.error(`Error deleting task: ${errorMessage(error)}`));
  }, [jobToDelete, projectUuid, deleteJob]);

  return {
    jobToCancel,
    jobToDelete,
    requestCancel: setJobToCancel,
    requestDelete: setJobToDelete,
    dismissCancel: () => setJobToCancel(null),
    dismissDelete: () => setJobToDelete(null),
    confirmCancel,
    confirmDelete,
  };
};

export type JobActions = ReturnType<typeof useJobActions>;
