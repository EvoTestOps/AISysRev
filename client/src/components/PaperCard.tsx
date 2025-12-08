import classNames from "classnames";
import {
  ChevronDown,
  ChevronUp,
  X,
  CircleQuestionMark,
  Check,
} from "lucide-react";
import { useState } from "react";
import { twMerge } from "tailwind-merge";
import { JobTaskHumanResult, PaperWithModelEval } from "../state/types";
import { Card, CardProps } from "./Card";
import { Button } from "./Button";
import { useTypedStoreActions, useTypedStoreState } from "../state/store";

type PaperCardProps = {
  paper: PaperWithModelEval;
};

export const PaperCard: React.FC<
  React.PropsWithChildren<CardProps> & PaperCardProps
> = ({ paper, ...rest }) => {
  const [open, setOpen] = useState(false);

  const getPaperPendingState = useTypedStoreState(
    (actions) => actions.getPaperPendingState
  );
  const isPending = getPaperPendingState(paper.uuid);
  const addHumanResult = useTypedStoreActions(
    (actions) => actions.addHumanResult
  );

  return (
    <Card {...rest} padding="p-0">
      <button
        className={twMerge(
          classNames(
            "rounded-lg p-4 grid grid-cols-[60px_1fr_240px_30px] items-center content-center hover:cursor-pointer hover:bg-gray-50"
          )
        )}
        onClick={() => {
          setOpen(!open);
        }}
      >
        <div className="text-sm font-semibold select-none text-left">
          {paper.paper_id}
        </div>
        <div
          className="text-sm font-semibold select-non text-left"
          title={paper.title}
        >
          {paper.title.length > 80
            ? paper.title.substring(0, 77) + "..."
            : paper.title}
        </div>
        <div
          className={classNames("text-center text-sm select-none", {
            "text-gray-400": paper.avg_probability_decision == null,
          })}
        >
          {paper.avg_probability_decision
            ? paper.avg_probability_decision.toFixed(3)
            : paper.error_messages?.length > 0
              ? "ERROR"
              : "Pending"}
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
      </button>
      {open && (
        <div className="pl-4 pr-4 pb-4">
          <div className="text-sm pt-2 pb-2">
            {paper.doi && (
              <>
                <strong>DOI:</strong>{" "}
                <a
                  href={`https://doi.org/${paper.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover-underline text-blue-600 hover-underline"
                >
                  {paper.doi}
                </a>
              </>
            )}
          </div>
          <div className="text-xs mb-4 bg-slate-200 rounded-md font-mono p-2">
            {paper.abstract}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              variant="red"
              size="xs"
              disabled={isPending}
              invert={paper.human_result !== JobTaskHumanResult.EXCLUDE}
              onClick={() => {
                addHumanResult({
                  projectUuid: paper.project_uuid,
                  paperUuid: paper.uuid,
                  humanResult: JobTaskHumanResult.EXCLUDE,
                });
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
              disabled={isPending}
              invert={paper.human_result !== JobTaskHumanResult.UNSURE}
              onClick={() => {
                addHumanResult({
                  projectUuid: paper.project_uuid,
                  paperUuid: paper.uuid,
                  humanResult: JobTaskHumanResult.UNSURE,
                });
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
              disabled={isPending}
              invert={paper.human_result !== JobTaskHumanResult.INCLUDE}
              onClick={() => {
                addHumanResult({
                  projectUuid: paper.project_uuid,
                  paperUuid: paper.uuid,
                  humanResult: JobTaskHumanResult.INCLUDE,
                });
              }}
            >
              <div className="flex flex-row gap-2 items-center font-semibold">
                <Check size={15} />
                <span className="select-none">Include</span>
              </div>
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
