import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Description,
} from "@headlessui/react";
import { useMemo, useCallback } from "react";
import { CircleX } from "lucide-react";
import { LlmModelCard } from "./LlmModelCard";
import { CriteriaList } from "./CriteriaList";
import { addJobTaskResult } from "../services/jobTaskService.ts";
import { ScreeningTask, JobTaskHumanResult } from "../state/types.ts"

type ManualEvaluationProps = {
  screeningTasks: ScreeningTask[];
  currentTaskUuid: string;
  inclusionCriteria: string[];
  exclusionCriteria: string[];
  onClose: () => void;
  onEvaluated: (uuid: string) => void;
};

export const ManualEvaluationModal: React.FC<ManualEvaluationProps> = ({
  screeningTasks,
  currentTaskUuid,
  inclusionCriteria,
  exclusionCriteria,
  onClose,
  onEvaluated,
}) => {
  const screeningTask = useMemo(
    () => screeningTasks.find(t => t.uuid === currentTaskUuid),
    [currentTaskUuid, screeningTasks]
  );

  const taskIndex = useMemo(() => {
    const idx = screeningTasks.findIndex(t => t.uuid === currentTaskUuid);
    return idx + 1;
  }, [screeningTasks, currentTaskUuid]);

  const addHumanResult = useCallback(async (humanResult: JobTaskHumanResult) => {
    try {
      await addJobTaskResult(currentTaskUuid, humanResult);
      onEvaluated(currentTaskUuid);
    } catch (error) {
      console.error("Error adding human result:", error);
    }
  }, [currentTaskUuid, onEvaluated]);

  if (!screeningTask) return <div>Loading...</div>;

  return (
    <Dialog
      open={true}
      onClose={onClose}
      className="fixed z-50 inset-0 flex items-center justify-center m-8 md:m-0"
    >
      <div className="fixed inset-0 bg-black/30 overflow-hidden" aria-hidden="true" />
      <DialogPanel className="relative bg-white shadow-2xl pt-8 pb-4 pl-8 pr-8 w-[800px] max-w-full max-h-[90vh] overflow-y-auto">
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

        <div className="flex gap-4 p-4 w-full bg-neutral-50 rounded-2xl mb-4">
          <div className="flex flex-col text-sm text-gray-700 max-w-md">
            <p className="font-bold pb-2">Inclusion criteria:</p>
            <CriteriaList criteria={inclusionCriteria} />
            <p className="font-bold pb-2 mt-4">Exclusion criteria:</p>
            <CriteriaList criteria={exclusionCriteria} />
          </div>
        </div>

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
            onClick={() => addHumanResult(JobTaskHumanResult.INCLUDE)}
          >
            Include (Y)
          </button>
          <button
            className="bg-yellow-500 text-white ml-4 mr-4 px-4 py-2 text-sm font-semibold rounded-3xl shadow-md cursor-pointer hover:bg-yellow-400"
            onClick={() => addHumanResult(JobTaskHumanResult.UNSURE)}
          >
            Unsure (U)
          </button>
          <button
            className="bg-red-500 text-white ml-4 mr-4 px-4 py-2 text-sm font-semibold rounded-3xl shadow-md cursor-pointer hover:bg-red-400"
            onClick={() => addHumanResult(JobTaskHumanResult.EXCLUDE)}
          >
            Exclude (N)
          </button>
        </div>
      </DialogPanel>
    </Dialog>
  );
};
