import classNames from "classnames";
import {
  ChevronDown,
  ChevronUp,
  X,
  CircleQuestionMark,
  Check,
} from "lucide-react";
import { useState, useCallback } from "react";
import { twMerge } from "tailwind-merge";
import { addPaperHumanResult } from "../services/paperService";
import { JobTaskHumanResult, PaperWithModelEval } from "../state/types";
import { Card, CardProps } from "./Card";
import { Button } from "./Button";

type PaperCardProps = {
  paper: PaperWithModelEval;
};

export const PaperCard: React.FC<
  React.PropsWithChildren<CardProps> & PaperCardProps
> = ({ paper, ...rest }) => {
  const [open, setOpen] = useState(false);

  const addHumanResult = useCallback(
    async (paperUuid: string, humanResult: JobTaskHumanResult) => {
      try {
        await addPaperHumanResult(paperUuid, humanResult);
      } catch (error) {
        console.error("Error adding human result:", error);
      }
    },
    []
  );

  return (
    <Card {...rest} padding="p-0">
      <div
        className={twMerge(
          classNames(
            "rounded-lg p-4 grid grid-cols-[60px_1fr_240px_30px] items-center content-center hover:cursor-pointer hover:bg-gray-50"
          )
        )}
        onClick={() => {
          setOpen(!open);
        }}
      >
        <div className="text-sm font-semibold select-none">
          {paper.paper_id}
        </div>
        <div className="text-sm font-semibold select-none" title={paper.title}>
          {paper.title.length > 80
            ? paper.title.substring(0, 77) + "..."
            : paper.title}
        </div>
        <div className="text-center text-sm select-none">
          {paper.avg_probability_decision
            ? paper.avg_probability_decision.toFixed(3)
            : "Not available"}
        </div>
        <div>
          {!open && (
            <ChevronDown
              className="hover:cursor-pointer"
              onClick={() => {
                setOpen(true);
              }}
            />
          )}
          {open && (
            <ChevronUp
              className="hover:cursor-pointer"
              onClick={() => {
                setOpen(false);
              }}
            />
          )}
        </div>
      </div>
      {open && (
        <div className="pl-4 pr-4 pb-4">
          <div className="text-xs mb-4 bg-slate-200 rounded-md font-mono p-2">
            {paper.abstract}
          </div>
          {paper.human_result === null && (
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                variant="red"
                size="xs"
                onClick={() => {
                  addHumanResult(paper.uuid, JobTaskHumanResult.EXCLUDE);
                }}
              >
                <div className="flex flex-row gap-2 items-center font-semibold">
                  <X size={15} />
                  <span className="select-none">Exclude</span>
                </div>
              </Button>
              <Button
                variant="yellow"
                size="xs"
                onClick={() => {
                  addHumanResult(paper.uuid, JobTaskHumanResult.UNSURE);
                }}
              >
                <div className="flex flex-row gap-2 items-center font-semibold">
                  <CircleQuestionMark size={15} />
                  <span className="select-none">Unsure</span>
                </div>
              </Button>
              <Button
                variant="green"
                size="xs"
                onClick={() => {
                  addHumanResult(paper.uuid, JobTaskHumanResult.INCLUDE);
                }}
              >
                <div className="flex flex-row gap-2 items-center font-semibold">
                  <Check size={15} />
                  <span className="select-none">Include</span>
                </div>
              </Button>
            </div>
          )}
          {paper.human_result !== null && (
            <div className="flex flex-wrap justify-center gap-2">
              Your evaluation: <strong>{paper.human_result}</strong>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
