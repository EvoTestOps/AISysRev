import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Description,
} from "@headlessui/react";
import { useEffect, useCallback, useState } from "react";
import { Check, CircleQuestionMark, CircleX, X } from "lucide-react";
import { LlmModelCard } from "./LlmModelCard";
import { CriteriaList } from "./CriteriaList";
import { Button } from "./Button";
import { addPaperHumanResult } from "../services/paperService";
import { JobTaskHumanResult, Paper } from "../state/types";
import axios from "axios";

type ManualEvaluationProps = {
  currentTaskUuid?: string;
  inclusionCriteria: string[];
  exclusionCriteria: string[];
  papers: Paper[];
  paperUuid: string | null;
  onClose: () => void;
  onEvaluated: () => void;
};

type ModelSuggestion = {
  modelName: string;
  binary: string;
  likertScale: number;
  probability: number;
};

export const ManualEvaluationModal: React.FC<ManualEvaluationProps> = ({
  inclusionCriteria,
  exclusionCriteria,
  papers,
  paperUuid,
  onClose,
  onEvaluated,
}) => {
  const currentPaper = papers.find((p) => p.uuid === paperUuid);

  const [modelSuggestions, setModelSuggestions] = useState<ModelSuggestion[]>(
    []
  );

  const addHumanResult = useCallback(
    async (humanResult: JobTaskHumanResult) => {
      if (!paperUuid) return;
      try {
        await addPaperHumanResult(paperUuid, humanResult);
        onEvaluated();
      } catch (error) {
        console.error("Error adding human result:", error);
      }
    },
    [paperUuid, onEvaluated]
  );

  const getModelSuggestions = useCallback(async (paperUuid: string) => {
    const response = await axios.get(`/api/v1/jobtask?paper_uuid=${paperUuid}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return response.data.map((entry: any) => ({
      modelName: entry.llm_config.model_name,
      binary: entry.result.overall_decision.binary_decision
        ? "Include"
        : "Exclude",
      likertScale: entry.result.overall_decision.likert_decision,
      probability: entry.result.overall_decision.probability_decision,
    }));
  }, []);

  useEffect(() => {
    if (paperUuid != null) {
      getModelSuggestions(paperUuid).then((s) => {
        console.log("Fetched suggestions", s);
        setModelSuggestions(s);
      });
    }
  }, [getModelSuggestions, paperUuid]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "y" || e.key === "Y" || e.key === "i" || e.key === "I") {
        addHumanResult(JobTaskHumanResult.INCLUDE);
      } else if (e.key === "u" || e.key === "U") {
        addHumanResult(JobTaskHumanResult.UNSURE);
      } else if (
        e.key === "n" ||
        e.key === "N" ||
        e.key === "e" ||
        e.key === "E"
      ) {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <DialogPanel className="relative bg-white shadow-2xl rounded-xl w-full h-full overflow-hidden">
        <CircleX
          onClick={onClose}
          className="absolute top-4 right-4 h-5 w-5 cursor-pointer text-gray-500 hover:text-gray-700 transition duration-200"
        />
        <div className="grid h-full gap-6 p-8 grid-cols-[14rem_3fr_2fr]">
          <div className="flex flex-col min-h-0">
            <DialogTitle className="text-base font-semibold mb-4">
              Model suggestions
            </DialogTitle>
            <div
              className="flex flex-col gap-4 overflow-y-auto pr-4 max-w-60
              [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {modelSuggestions.map((suggestion, i) => (
                <LlmModelCard
                  key={i}
                  modelName={suggestion.modelName}
                  binary={suggestion.binary}
                  likertScale={suggestion.likertScale}
                  probability={suggestion.probability}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col min-h-0">
            <div className="pr-10">
              <DialogTitle className="text-lg font-bold mb-3">
                Paper #{currentPaper.paper_id}: {currentPaper.title}
              </DialogTitle>
            </div>
            <div
              className="flex-1 overflow-y-auto
              [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              <Description className="text-sm leading-relaxed whitespace-pre-line">
                {currentPaper.abstract}
              </Description>
            </div>
            <div className="pt-4">
              <div className="flex flex-wrap justify-center gap-6">
                <Button
                  variant="green"
                  onClick={() => addHumanResult(JobTaskHumanResult.INCLUDE)}
                >
                  <div className="flex flex-row gap-2 items-center font-semibold">
                    <Check />
                    <span>Include (Y / I)</span>
                  </div>
                </Button>
                <Button
                  variant="yellow"
                  onClick={() => addHumanResult(JobTaskHumanResult.UNSURE)}
                >
                  <div className="flex flex-row gap-2 items-center font-semibold">
                    <CircleQuestionMark />
                    <span>Unsure (U)</span>
                  </div>
                </Button>
                <Button
                  variant="red"
                  onClick={() => addHumanResult(JobTaskHumanResult.EXCLUDE)}
                >
                  <div className="flex flex-row gap-2 items-center font-semibold">
                    <X />
                    <span>Exclude (N / E)</span>
                  </div>
                </Button>
              </div>
            </div>
          </div>

          <div
            className="flex flex-col overflow-y-auto
          [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            <p className="font-bold text-sm mb-2">Inclusion criteria</p>
            <div className="bg-blue-50 rounded-xl p-3 mb-4">
              <CriteriaList criteria={inclusionCriteria} />
            </div>
            <p className="font-bold text-sm mb-2">Exclusion criteria</p>
            <div className="bg-blue-50 rounded-xl p-3">
              <CriteriaList criteria={exclusionCriteria} />
            </div>
          </div>
        </div>
      </DialogPanel>
    </Dialog>
  );
};
