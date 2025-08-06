import { Dialog, DialogPanel, DialogTitle, Description } from "@headlessui/react";

type ManualEvaluationProps = {
    onClose: () => void;
};

export const ManualEvaluationModal: React.FC<ManualEvaluationProps> = ({ onClose }) => {
    return (
        <Dialog open={true} onClose={onClose} className="fixed z-50 inset-0 flex items-center justify-center">
            <DialogPanel className="bg-white rounded-2xl shadow-2xl p-8 w-[800px] max-w-full">
                <DialogTitle className="text-lg font-bold mb-2">Paper #622: The title of the paper</DialogTitle>
                <Description className="text-sm mb-2">
                Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus...
                </Description>

                <button
                    onClick={onClose}
                    className="mt-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 border border-gray-300 rounded-lg"
                >
                    Cancel
                </button>
            </DialogPanel>
        </Dialog>
    )
}