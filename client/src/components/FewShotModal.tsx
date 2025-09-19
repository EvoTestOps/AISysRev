import { Dialog, DialogPanel, Description } from "@headlessui/react";
import { ArrowRight, CircleX, InfoIcon } from "lucide-react";
import { H3, H4 } from "./Typography";
import { Button } from "./Button";
import { useTypedStoreState } from "../state/store";
import { useParams } from "wouter";
import { JobTaskHumanResult, PaperWithModelEval } from "../state/types";
import Tooltip from "@mui/material/Tooltip";

type FewShotModalProps = {
  onClose: () => void;
};

type SeedPaperProps = {
  paper: PaperWithModelEval;
  selected: boolean;
} & React.HTMLAttributes<HTMLDivElement>;

const SeedPaper: React.FC<SeedPaperProps> = ({ paper, selected, ...rest }) => (
  <div className="grid grid-cols-[1fr_80px] gap-2" {...rest}>
    <div
      className="p-2 rounded-md hover:cursor-pointer hover:bg-gray-200"
      onClick={() => {
        console.log("Foo");
      }}
    >
      {paper.title}
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
  const exclusionSeeds = [...papers].filter(
    (paper) =>
      paper.human_result !== null &&
      paper.human_result == JobTaskHumanResult.INCLUDE
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
      <DialogPanel className="relative bg-white p-4 shadow-2xl rounded-xl w-2/3 h-2/3 overflow-hidden">
        <CircleX
          onClick={onClose}
          className="absolute top-4 right-4 h-5 w-5 cursor-pointer text-gray-500 hover:text-gray-700 transition duration-200"
        />
        <div className="flex flex-col gap-2">
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
          <H4>Inclusion seed papers</H4>
          <div className="flex flex-col gap-2 overflow-y-scroll h-72">
            <div className="grid grid-cols-[1fr_80px] gap-2 sticky top-0">
              <div className="font-bold p-2 bg-slate-800 text-white rounded-md">
                Title
              </div>
              <div className="font-bold flex items-center content-center justify-center p-2 bg-slate-800 text-white rounded-md">
                Score
              </div>
            </div>
            {sortedInclusionSeeds.map((s, i) => (
              <SeedPaper paper={s} key={s.uuid} selected={i % 2 === 0} />
            ))}
          </div>
          <div className="flex flex-row gap-2 items-center content-center">
            <Button variant="purple">Auto-select</Button>
            <Tooltip title="Automatically selects three papers that have the highest probability" arrow>
              <InfoIcon size={20} />
            </Tooltip>
          </div>
          {/* <H4>Exclusion seed papers</H4>
          <div>{exclusionSeeds.length}</div> */}
          <div className="flex flex-row justify-end">
            <Button disabled>
              <ArrowRight /> Next: Exclusion seed papers
            </Button>
          </div>
        </div>
      </DialogPanel>
    </Dialog>
  );
};
