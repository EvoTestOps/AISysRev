import CloseIcon from "@mui/icons-material/Close";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import type { Project } from "../../state/types/project";
import { TaskSetupForm } from "./createTask/TaskSetupForm";
import { CreateTaskForm } from "./hooks/useCreateTaskForm";

type NewTaskDialogProps = {
  open: boolean;
  onClose: () => void;
  project: Project;
  form: CreateTaskForm;
  paperCount: number;
  itemName: string;
  itemNamePlural: string;
  isGithubScreening: boolean;
};

/** The task form in a dialog, for projects that already have tasks. Full screen on phones. */
export const NewTaskDialog: React.FC<NewTaskDialogProps> = ({
  open,
  onClose,
  ...formProps
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="md"
      aria-labelledby="new-task-dialog-title"
      slotProps={{ paper: { sx: { borderRadius: fullScreen ? 0 : 3 } } }}
    >
      <DialogTitle id="new-task-dialog-title" sx={{ fontWeight: 600, pr: 7 }}>
        New screening task
      </DialogTitle>
      <IconButton
        aria-label="Close"
        onClick={onClose}
        sx={{ position: "absolute", right: 12, top: 12 }}
      >
        <CloseIcon />
      </IconButton>
      <DialogContent dividers sx={{ py: 3 }}>
        <TaskSetupForm {...formProps} onCreated={onClose} />
      </DialogContent>
    </Dialog>
  );
};
