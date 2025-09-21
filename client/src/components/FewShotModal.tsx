import { Dialog, DialogPanel, Description } from "@headlessui/react";
import {
  ArrowLeft,
  ArrowRight,
  Circle,
  CircleX,
  Sparkles,
  Square,
  SquareCheckBig,
} from "lucide-react";
import { H3, H4 } from "./Typography";
import { Button } from "./Button";
import { useTypedStoreState } from "../state/store";
import { useParams } from "wouter";
import { JobTaskHumanResult, PaperWithModelEval } from "../state/types";
import { twMerge } from "tailwind-merge";
import classNames from "classnames";
import { useState } from "react";
import { AlertMessage } from "./AlertMessage";

type FewShotModalProps = {
  onClose: () => void;
};

type SeedPaperProps = {
  paper: PaperWithModelEval;
  selected: boolean;
  disabled?: boolean;
  onTitleClick?: (paperUuid: string) => void;
} & React.HTMLAttributes<HTMLDivElement>;

const SeedPaper: React.FC<SeedPaperProps> = ({
  paper,
  selected,
  disabled = false,
  onTitleClick,
  ...rest
}) => (
  <div className="grid grid-cols-[1fr_80px] gap-2" {...rest}>
    <div
      className={twMerge(
        classNames(
          "p-2 rounded-md hover:cursor-pointer grid grid-cols-[1fr_20px] items-center",
          {
            "bg-blue-700 hover:bg-blue-600 text-white": selected,
            "hover:bg-gray-200 odd:bg-gray-100": !selected,
            "opacity-20 hover:cursor-not-allowed": disabled,
          }
        )
      )}
      onClick={() => {
        if (onTitleClick && !disabled) {
          onTitleClick(paper.uuid);
        }
      }}
    >
      <span className="select-none font-bold">{paper.title}</span>
      <span>
        {!selected && <Square size={18} />}
        {selected && <SquareCheckBig size={18} />}
      </span>
    </div>
    <div
      className="flex items-center content-center justify-center p-2"
      key={`${paper.uuid}_score`}
    >
      0.956
    </div>
  </div>
);

export const FewShotModal: React.FC<FewShotModalProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState<
    "INCLUSION_SEED" | "EXCLUSION_SEED" | "OVERVIEW"
  >("INCLUSION_SEED");
  const params = useParams<{ uuid: string }>();
  const projectUuid = params.uuid;
  const getPapersForProject = useTypedStoreState(
    (state) => state.getPapersForProject
  );
  const papers = getPapersForProject(projectUuid);

  const inclusionSeeds = [...papers].filter(
    (paper) =>
      paper.human_result !== null &&
      paper.human_result == JobTaskHumanResult.INCLUDE
  );
  const sortedInclusionSeeds = [...inclusionSeeds].sort((a, b) => {
    if (
      a.avg_probability_decision === undefined &&
      b.avg_probability_decision === undefined
    ) {
      return 0;
    }
    if (a.avg_probability_decision === undefined) {
      return -1;
    }
    if (b.avg_probability_decision === undefined) {
      return 1;
    }
    return a.avg_probability_decision - b.avg_probability_decision;
  });

  const [selectedInclusionSeeds, setSelectedInclusionSeeds] = useState<
    Array<string>
  >([]);
  const [selectedExclusionSeeds, setSelectedExclusionSeeds] = useState<
    Array<string>
  >([]);
  const exclusionSeeds = [...papers].filter(
    (paper) =>
      paper.human_result !== null &&
      paper.human_result == JobTaskHumanResult.EXCLUDE
  );
  const sortedExclusionSeeds = [...exclusionSeeds].sort((a, b) => {
    if (
      a.avg_probability_decision === undefined &&
      b.avg_probability_decision === undefined
    ) {
      return 0;
    }
    if (a.avg_probability_decision === undefined) {
      return -1;
    }
    if (b.avg_probability_decision === undefined) {
      return 1;
    }
    return a.avg_probability_decision - b.avg_probability_decision;
  });

  return (
    <Dialog
      open={true}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClose={onClose}
    >
      <div className="fixed inset-0 bg-black/60" aria-hidden="true" />
      <DialogPanel className="relative bg-white p-4 shadow-2xl rounded-xl w-full md:w-5/6  h-2/3">
        <CircleX
          onClick={onClose}
          className="absolute top-4 right-4 h-5 w-5 cursor-pointer text-gray-500 hover:text-gray-700 transition duration-200"
        />
        <div className="grid grid-rows-[auto_auto_auto_1fr_auto_auto] gap-2 h-full">
          <H3>Few-shot screening</H3>
          <Description className="bg-sky-200 p-3 text-sm rounded-md">
            <strong>Few-shot screening</strong> requires seed papers, which can
            aid in LLM decision making. Below, you can automatically select up
            to three papers per category (include / exclude), based on your
            manual evaluation results. The papers are ordered by <br />
            <strong>1)</strong> suitable category and <strong>2)</strong> the
            probability of given category. You can always choose the papers
            manually.
          </Description>
          <H4>
            {currentStep === "INCLUSION_SEED" &&
              "Inclusion seed papers" + " (" + inclusionSeeds.length + ")"}
            {currentStep === "EXCLUSION_SEED" &&
              "Exclusion seed papers" + " (" + exclusionSeeds.length + ")"}
            {currentStep === "OVERVIEW" && "Overview"}
          </H4>
          <div className="flex flex-col gap-2 overflow-y-scroll h-96">
            {currentStep === "INCLUSION_SEED" ||
              (currentStep === "EXCLUSION_SEED" && (
                <div className="grid grid-cols-[1fr_80px] gap-2 sticky top-0 z-50">
                  <div className="font-bold p-2 bg-slate-800 text-white rounded-md">
                    Title
                  </div>
                  <div className="font-bold flex items-center content-center justify-center p-2 bg-slate-800 text-white rounded-md">
                    Score
                  </div>
                </div>
              ))}
            {currentStep === "OVERVIEW" && <div>Hello!</div>}
            {currentStep === "INCLUSION_SEED" &&
              sortedInclusionSeeds.length === 0 && (
                <div className="grid grid-cols-[1fr_80px] gap-2 p-2">
                  <AlertMessage message="No manually evaluated papers that are labelled as included. Please first manually evaluate the papers." />
                  <div />
                </div>
              )}
            {currentStep === "INCLUSION_SEED" &&
              sortedInclusionSeeds.length > 0 &&
              sortedInclusionSeeds.map((s) => (
                <SeedPaper
                  paper={s}
                  key={s.uuid}
                  selected={selectedInclusionSeeds.includes(s.uuid)}
                  disabled={
                    !selectedInclusionSeeds.includes(s.uuid) &&
                    selectedInclusionSeeds.length === 3
                  }
                  onTitleClick={() => {
                    if (selectedInclusionSeeds.includes(s.uuid)) {
                      setSelectedInclusionSeeds((prev) =>
                        [...prev].filter((p) => p !== s.uuid)
                      );
                    } else {
                      setSelectedInclusionSeeds((prev) => [...prev, s.uuid]);
                    }
                  }}
                />
              ))}
            {currentStep === "EXCLUSION_SEED" &&
              sortedExclusionSeeds.length === 0 && (
                <div className="grid grid-cols-[1fr_80px] gap-2 p-2">
                  <AlertMessage message="No manually evaluated papers that are labelled as excluded. Please first manually evaluate the papers." />
                  <div />
                </div>
              )}
            {currentStep === "EXCLUSION_SEED" &&
              sortedExclusionSeeds.length > 0 &&
              sortedExclusionSeeds.map((s) => (
                <SeedPaper
                  paper={s}
                  key={s.uuid}
                  selected={selectedExclusionSeeds.includes(s.uuid)}
                  disabled={
                    !selectedExclusionSeeds.includes(s.uuid) &&
                    selectedExclusionSeeds.length === 3
                  }
                  onTitleClick={() => {
                    if (selectedExclusionSeeds.includes(s.uuid)) {
                      setSelectedExclusionSeeds((prev) =>
                        [...prev].filter((p) => p !== s.uuid)
                      );
                    } else {
                      setSelectedExclusionSeeds((prev) => [...prev, s.uuid]);
                    }
                  }}
                />
              ))}
          </div>
          <div className="flex flex-row gap-2 items-center content-center justify-center h-12">
            {currentStep === "INCLUSION_SEED" ? (
              <Circle size={16} className="fill-slate-600 stroke-slate-600" />
            ) : (
              <Circle
                size={16}
                className="hover:cursor-pointer stroke-slate-600"
                onClick={() => setCurrentStep("INCLUSION_SEED")}
              />
            )}
            {currentStep === "EXCLUSION_SEED" ? (
              <Circle size={16} className="fill-slate-600 stroke-slate-600" />
            ) : (
              <Circle
                size={16}
                className={twMerge(
                  classNames("stroke-slate-600 hover:cursor-pointer", {
                    "opacity-35 hover:cursor-not-allowed":
                      selectedInclusionSeeds.length === 0,
                  })
                )}
                onClick={() => {
                  if (selectedInclusionSeeds.length > 0) {
                    setCurrentStep("EXCLUSION_SEED");
                  }
                }}
              />
            )}
            {currentStep === "OVERVIEW" ? (
              <Circle size={16} className="fill-slate-600 stroke-slate-600" />
            ) : (
              <Circle
                size={16}
                className={twMerge(
                  classNames("stroke-slate-600 hover:cursor-pointer", {
                    "opacity-35 hover:cursor-not-allowed":
                      selectedExclusionSeeds.length === 0 ||
                      selectedInclusionSeeds.length === 0,
                  })
                )}
                onClick={() => {
                  if (
                    selectedExclusionSeeds.length > 0 &&
                    selectedInclusionSeeds.length > 0
                  ) {
                    setCurrentStep("OVERVIEW");
                  }
                }}
              />
            )}
          </div>
          <div className="flex justify-between items-center">
            <div className="flex flex-row gap-2 items-center content-center">
              {/* <Button variant="purple">Auto-select</Button>
              <Tooltip
                title="Automatically selects three papers that have the highest probability"
                arrow
              >
                <InfoIcon size={20} />
              </Tooltip> */}
            </div>

            <div className="flex flex-row gap-2">
              {currentStep === "EXCLUSION_SEED" && (
                <Button
                  disabled={selectedInclusionSeeds.length === 0}
                  variant="gray"
                  onClick={() => setCurrentStep("INCLUSION_SEED")}
                >
                  <ArrowLeft /> Back
                </Button>
              )}
              {currentStep === "OVERVIEW" && (
                <Button
                  disabled={selectedInclusionSeeds.length === 0}
                  variant="gray"
                  onClick={() => setCurrentStep("EXCLUSION_SEED")}
                >
                  <ArrowLeft /> Back
                </Button>
              )}
              {currentStep === "OVERVIEW" && (
                <Button
                  disabled={selectedInclusionSeeds.length === 0}
                  variant="purple"
                  onClick={() => setCurrentStep("EXCLUSION_SEED")}
                >
                  <Sparkles />
                  <div className="bg-white text-purple-700 pl-2 pr-2 rounded-md">
                    FS
                  </div>
                  <span>Start Few-shot</span>
                </Button>
              )}
              {currentStep === "INCLUSION_SEED" && (
                <Button
                  disabled={selectedInclusionSeeds.length === 0}
                  onClick={() => setCurrentStep("EXCLUSION_SEED")}
                >
                  <ArrowRight /> Next: Exclusion seed papers
                </Button>
              )}
              {currentStep === "EXCLUSION_SEED" && (
                <Button
                  disabled={selectedExclusionSeeds.length === 0}
                  onClick={() => setCurrentStep("OVERVIEW")}
                >
                  <ArrowRight /> Next: Overview
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogPanel>
    </Dialog>
  );
};
