import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

type ConfirmationModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmButtonLabel: string;
  /** error for destructive actions, warning for disruptive ones. */
  confirmColor: "error" | "warning" | "primary";
  confirmButtonIcon?: React.ReactNode;
  confirmButtonTestId?: string;
};

/** A dialog asking the user to confirm an action before it runs. */
export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmButtonLabel,
  confirmColor,
  confirmButtonIcon,
  confirmButtonTestId,
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    maxWidth="xs"
    fullWidth
    aria-labelledby="confirmation-dialog-title"
    aria-describedby="confirmation-dialog-description"
  >
    <DialogTitle id="confirmation-dialog-title">{title}</DialogTitle>
    <DialogContent>
      <DialogContentText id="confirmation-dialog-description">{description}</DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Go back</Button>
      <Button
        variant="contained"
        color={confirmColor}
        startIcon={confirmButtonIcon}
        onClick={onConfirm}
        data-testid={confirmButtonTestId}
      >
        {confirmButtonLabel}
      </Button>
    </DialogActions>
  </Dialog>
);
