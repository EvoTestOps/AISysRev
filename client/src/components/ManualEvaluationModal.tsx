import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Description,
} from "@headlessui/react";
import { CircleX } from "lucide-react";
import { LlmModelCard } from "./LlmModelCard";
import { useMemo } from "react";
import { ScreeningTask, JobTaskResult } from "../state/types.ts"

type ManualEvaluationProps = {
  screeningTaskUuids: string[];
  currentTaskUuid: string;
  screeningTasks: ScreeningTask[];
  onClose: () => void;
};

export const ManualEvaluationModal: React.FC<ManualEvaluationProps> = ({
  screeningTaskUuids,
  currentTaskUuid,
  screeningTasks,
  onClose,
}) => {
  const addHumanResult = (result: JobTaskResult) => {
    console.log(result);
  }

  const screeningTask = useMemo(
    () => screeningTasks.find(t => t.uuid === currentTaskUuid),
    [currentTaskUuid, screeningTasks]
  );

  const taskIndex = useMemo(() => {
    const idx = screeningTaskUuids.indexOf(currentTaskUuid);
    return idx + 1;
  }, [screeningTaskUuids, currentTaskUuid]);

  if (!screeningTask) return <div>Loading...</div>;

  return (
    <Dialog
      open={true}
      onClose={onClose}
      className="fixed z-50 inset-0 flex items-center justify-center m-8 md:m-0"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <DialogPanel className="relative bg-white rounded-2xl shadow-2xl pt-8 pb-4 pl-8 pr-8 w-[800px] max-w-full">
        <CircleX
          onClick={onClose}
          className="absolute top-4 right-4 h-5 w-5 cursor-pointer text-gray-500 hover:text-gray-700 transition duration-200"
        />
        <DialogTitle className="text-lg font-bold mb-2">
          Paper #{taskIndex}: {screeningTask.title}
        </DialogTitle>
        <Description className="text-sm mb-4">
          {screeningTask.abstract}
        </Description>

        <div className="flex flex-wrap justify-evenly gap-4">
          <LlmModelCard
            modelName="GPT-4.1 Nano"
            binary="Include"
            likertScale={6}
            probability={0.85}
          />
          <LlmModelCard
            modelName="GPT-4.1 Mini"
            binary="Include"
            likertScale={5}
            probability={0.75}
          />
          <LlmModelCard
            modelName="Claude 3.7"
            binary="Exclude"
            likertScale={4}
            probability={0.45}
          />
          <LlmModelCard
            modelName="GPT-5"
            binary="Include"
            likertScale={6}
            probability={0.85}
          />
        </div>

        <div className="flex justify-center m-4 pt-2 ">
          <button
            className="bg-green-600 text-white ml-4 mr-4 px-4 py-2 text-sm font-semibold rounded-3xl shadow-md cursor-pointer hover:bg-green-500"
            onClick={() => addHumanResult("INCLUDE")}
          >
            Include (Y)
          </button>
          <button
            className="bg-yellow-500 text-white ml-4 mr-4 px-4 py-2 text-sm font-semibold rounded-3xl shadow-md cursor-pointer hover:bg-yellow-400"
            onClick={() => addHumanResult("UNSURE")}
          >
            Unsure (U)
          </button>
          <button 
            className="bg-red-500 text-white ml-4 mr-4 px-4 py-2 text-sm font-semibold rounded-3xl shadow-md cursor-pointer hover:bg-red-400"
            onClick={() => addHumanResult("EXCLUDE")}
          >
            Exclude (N)
          </button>
        </div>
      </DialogPanel>
    </Dialog>
  );
};
