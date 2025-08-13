import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Description,
} from "@headlessui/react";
import { useState, useEffect, useCallback } from "react";
import { CircleX } from "lucide-react";
import { LlmModelCard } from "./LlmModelCard";
import { CriteriaList } from "./CriteriaList";
import { Button } from "./Button"
import { addJobTaskResult, fetchPapersFromBackend } from "../services/jobTaskService.ts";
import { ScreeningTask, JobTaskHumanResult } from "../state/types.ts"
import { UUID } from "crypto";

type ManualEvaluationProps = {
  projectUuid: string;
  screeningTasks: ScreeningTask[];
  currentTaskUuid: string;
  inclusionCriteria: string[];
  exclusionCriteria: string[];
  onClose: () => void;
  onEvaluated: (uuid: string) => void;
};

type Papers = {
  uuid: UUID
  paper_id: number
  project_uuid: UUID
  file_uuid: UUID
  doi: string
  title: string
  abstract: string
  created_at: Date | null
  updated_at: Date | null
}

export const ManualEvaluationModal: React.FC<ManualEvaluationProps> = ({
  projectUuid,
  screeningTasks,
  currentTaskUuid,
  inclusionCriteria,
  exclusionCriteria,
  onClose,
  onEvaluated,
}) => {
  const [papers, setPapers] = useState<Papers[]>([]);
  const [currentPaperId, setCurrentPaperId] = useState<number>(1)

  useEffect(() => {
    const fetchPapers = async () => {
      const fetchedPapers = await fetchPapersFromBackend(projectUuid);
      setPapers(fetchedPapers);
      setCurrentPaperId(1);
    };
    fetchPapers();
  }, [projectUuid]);

  const currentPaper = papers.find(paper => paper.paper_id === currentPaperId);

  const nextPaper = useCallback(() => {
    const nextIndex = papers.findIndex(paper => paper.paper_id === currentPaperId) + 1;
    if (nextIndex < papers.length) {
      setCurrentPaperId(papers[nextIndex].paper_id);
    } else {
      onClose();
    }
  }, [currentPaperId, papers, onClose]);

  const addHumanResult = useCallback(async (humanResult: JobTaskHumanResult) => {
    try {
      await addJobTaskResult(currentTaskUuid, humanResult);
      onEvaluated(currentTaskUuid);
      nextPaper();
    } catch (error) {
      console.error("Error adding human result:", error);
    }
  }, [currentTaskUuid, onEvaluated, nextPaper]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "y" || e.key === "Y") {
        addHumanResult(JobTaskHumanResult.INCLUDE);
      } else if (e.key === "u" || e.key === "U") {
        addHumanResult(JobTaskHumanResult.UNSURE);
      } else if (e.key === "n" || e.key === "N") {
        addHumanResult(JobTaskHumanResult.EXCLUDE);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [addHumanResult]);

  if (!currentPaper) return <div>Loading...</div>;

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
          Paper #{currentPaper.paper_id}: {currentPaper.title}
        </DialogTitle>
        <Description className="text-sm mb-4">
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

        <div className="flex justify-center m-4 pt-2 ">
          <Button
            variant="green"
            onClick={() => addHumanResult(JobTaskHumanResult.INCLUDE)}
          >
            Include (Y)
          </Button>
          <Button
            variant="yellow"
            onClick={() => addHumanResult(JobTaskHumanResult.UNSURE)}
          >
            Unsure (U)
          </Button>
          <Button
            variant="red"
            onClick={() => addHumanResult(JobTaskHumanResult.EXCLUDE)}
          >
            Exclude (N)
          </Button>
        </div>
      </DialogPanel>
    </Dialog>
  );
};
