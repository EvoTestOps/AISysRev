import { Dialog, DialogPanel, DialogTitle, Description } from "@headlessui/react";
import { CircleX } from "lucide-react";
import { LlmModelCard } from "./LlmModelCard";

type ManualEvaluationProps = {
  onClose: () => void;
};

export const ManualEvaluationModal: React.FC<ManualEvaluationProps> = ({ onClose }) => {
  return (
    <Dialog open={true} onClose={onClose} className="fixed z-50 inset-0 flex items-center justify-center">
      <DialogPanel className="relative bg-white rounded-2xl shadow-2xl pt-8 pb-4 pl-8 pr-8 w-[800px] max-w-full">
        <CircleX
          onClick={onClose}
          className="absolute top-4 right-4 h-5 w-5 cursor-pointer text-gray-500 hover:text-gray-700 transition duration-200"
        />
        <DialogTitle className="text-lg font-bold mb-2">Paper #622: The title of the paper</DialogTitle>
        <Description className="text-sm mb-4">
          Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus...
        </Description>
        
        <div className="flex justify-center gap-4">
          <LlmModelCard
            modelName="Model A"
            binary="Include"
            likertScale={6}
            probability={0.85}
          />

          <LlmModelCard
            modelName="Model B"
            binary="Include"
            likertScale={5}
            probability={0.75}
          />

          <LlmModelCard
            modelName="Model C"
            binary="Exclude"
            likertScale={4}
            probability={0.45}
          />
        </div>

        <div className="flex justify-center m-4 pt-2 ">
          <button className="bg-green-600 text-white ml-4 mr-4 px-4 py-2 text-sm font-semibold rounded-3xl shadow-md cursor-pointer hover:bg-green-500">Include (Y)</button>
          <button className="bg-yellow-500 text-white ml-4 mr-4 px-4 py-2 text-sm font-semibold rounded-3xl shadow-md cursor-pointer hover:bg-yellow-400">Unsure (U)</button>
          <button className="bg-red-500 text-white ml-4 mr-4 px-4 py-2 text-sm font-semibold rounded-3xl shadow-md cursor-pointer hover:bg-red-400">Exclude (N)</button>
        </div>
      </DialogPanel>
    </Dialog>
  )
}