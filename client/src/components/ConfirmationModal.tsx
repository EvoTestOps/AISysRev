import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Description,
} from "@headlessui/react";
import { X } from "lucide-react";
import { Button } from "./Button";

type ConfirmationModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmButtonLabel: string;
  confirmButtonVariant: "green" | "yellow" | "red" | "purple" | "gray" | "slate";
  confirmButtonIcon: React.ReactNode;
};

export const ConrimationModal: React.FC<ConfirmationModalProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmButtonLabel,
  confirmButtonVariant,
  confirmButtonIcon,
}) => {

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <DialogPanel className="relative bg-white shadow-2xl rounded-xl w-full max-w-md p-8">
        <X
          onClick={onClose}
          className="absolute top-4 right-4 h-5 w-5 cursor-pointer text-gray-500 hover:text-gray-700 transition duration-200"
        />

        <DialogTitle className="text-lg font-bold mb-3">
          {title}
        </DialogTitle>

        <Description className="text-sm text-gray-600 mb-6 leading-relaxed">
          {description}
        </Description>

        <div className="flex gap-3 justify-end">
          <Button
            variant="gray"
            onClick={onClose}
          >
            Go back
          </Button>
          <Button
            variant={confirmButtonVariant}
            onClick={onConfirm}
          >
            <div className="flex items-center justify-center gap-2 font-semibold">
              {confirmButtonIcon}
              <span>{confirmButtonLabel}</span>
            </div>
          </Button>
        </div>
      </DialogPanel>
    </Dialog >
  )
}
