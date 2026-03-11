import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Description,
} from "@headlessui/react";
import { CircleStop, X } from "lucide-react";
import { Button } from "./Button";

type CancelJobModalProps = {
  open: boolean;
  onClose: () => void;
  onCancel: () => void;
};

export const CancelJobModal: React.FC<CancelJobModalProps> = ({
  open,
  onClose,
  onCancel,
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
          Cancel screening task?
        </DialogTitle>

        <Description className="text-sm text-gray-600 mb-6 leading-relaxed">
          This will cancel running and scheduled screening jobs.
        </Description>

        <Button
          variant="yellow"
          onClick={onCancel}
        >
          <div className="flex items-center justify-center gap-2 font-semibold">
            <CircleStop size={16} />
            <span>Cancel task</span>
          </div>
        </Button>

        {/* <div className="flex flex-col gap-3"> */}
        {/*   <Button */}
        {/*     variant="yellow" */}
        {/*     onClick={onKeepData} */}
        {/*   > */}
        {/*     <div className="flex items-center justify-center gap-2 font-semibold"> */}
        {/*       <CircleStop size={16} /> */}
        {/*       <span>Keep screened data</span> */}
        {/*     </div> */}
        {/*   </Button> */}
        {/**/}
        {/*   <Button */}
        {/*     variant="red" */}
        {/*     onClick={onDeleteData} */}
        {/*   > */}
        {/*     <div className="flex items-center justify-center gap-2 font-semibold"> */}
        {/*       <Trash2 size={16} /> */}
        {/*       <span>Delete data</span> */}
        {/*     </div> */}
        {/*   </Button> */}
        {/**/}
        {/* <Button */}
        {/*   variant="gray" */}
        {/*   onClick={onClose} */}
        {/* > */}
        {/*   <div className="flex items-center justify-center gap-2 font-semibold"> */}
        {/*     <ArrowLeft size={16} /> */}
        {/*     <span>Go back</span> */}
        {/*   </div> */}
        {/* </Button> */}
        {/* </div> */}
      </DialogPanel>
    </Dialog >
  )
}
