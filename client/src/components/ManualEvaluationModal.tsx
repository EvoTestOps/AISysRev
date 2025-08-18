import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Description,
} from "@headlessui/react";
import { useEffect, useCallback } from "react";
import { CircleX } from "lucide-react";
import { LlmModelCard } from "./LlmModelCard";
import { CriteriaList } from "./CriteriaList";
import { Button } from "./Button";
import { addJobTaskResult } from "../services/jobTaskService";
import { JobTaskHumanResult, Paper } from "../state/types";

type ManualEvaluationProps = {
  currentTaskUuid: string;
  inclusionCriteria: string[];
  exclusionCriteria: string[];
  papers: Paper[];
  paperUuid: string | null;
  onClose: () => void;
  onEvaluated: () => void;
};

export const ManualEvaluationModal: React.FC<ManualEvaluationProps> = ({
  currentTaskUuid,
  inclusionCriteria,
  exclusionCriteria,
  papers,
  paperUuid,
  onClose,
  onEvaluated,
}) => {
  const currentPaper = papers.find(p => p.uuid === paperUuid);

  const addHumanResult = useCallback(
    async (humanResult: JobTaskHumanResult) => {
      try {
        await addJobTaskResult(currentTaskUuid, humanResult);
        onEvaluated();
      } catch (error) {
        console.error("Error adding human result:", error);
      }
    },
    [currentTaskUuid, onEvaluated]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "y" || e.key === "Y" || e.key === "i" || e.key === "I") {
        addHumanResult(JobTaskHumanResult.INCLUDE);
      } else if (e.key === "u" || e.key === "U") {
        addHumanResult(JobTaskHumanResult.UNSURE);
      } else if (e.key === "n" || e.key === "N" || e.key === "e" || e.key === "E") {
        addHumanResult(JobTaskHumanResult.EXCLUDE);
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [addHumanResult, onClose]);

  if (!currentPaper) return null;

  return (
    <Dialog
      open={true}
      onClose={onClose}
      className="fixed z-50 inset-0 flex items-center justify-center m-8 md:m-0"
    >
      <div className="fixed inset-0 bg-black/30 overflow-hidden" aria-hidden="true" />
      <DialogPanel className="relative bg-white shadow-2xl pt-8 pb-4 px-8 w-[800px] max-w-full max-h-[90vh] overflow-y-auto rounded">
        <CircleX
          onClick={onClose}
            className="absolute top-4 right-4 h-5 w-5 cursor-pointer text-gray-500 hover:text-gray-700 transition duration-200"
        />
        <DialogTitle className="text-lg font-bold mb-2">
          Paper #{currentPaper.paper_id}: {currentPaper.title}
        </DialogTitle>
        <Description className="text-sm mb-4 whitespace-pre-line">
          {currentPaper.abstract}
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

        <div className="flex justify-center m-4 pt-2 gap-4">
          <Button
            variant="green"
            className="ml-4 mr-4"
            onClick={() => addHumanResult(JobTaskHumanResult.INCLUDE)}
          >
            Include (Y / I)
          </Button>
          <Button
            variant="yellow"
            className="ml-4 mr-4"
            onClick={() => addHumanResult(JobTaskHumanResult.UNSURE)}
          >
            Unsure (U)
          </Button>
          <Button
            variant="red"
            className="ml-4 mr-4"
            onClick={() => addHumanResult(JobTaskHumanResult.EXCLUDE)}
          >
            Exclude (N / E)
          </Button>
        </div>
      </DialogPanel>
    </Dialog>
  );
};