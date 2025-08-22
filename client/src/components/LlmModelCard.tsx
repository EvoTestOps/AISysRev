type LlmModelCardProps = {
  modelName: string;
  binary: string;
  likertScale: number;
  probability: number;
};

const likertMap = {
  1: "Strongly disagree",
  2: "Disagree",
  3: "Somewhat disagree",
  4: "Neither agree nor disagree",
  5: "Somewhat agree",
  6: "Agree",
  7: "Strongly agree",
};

export const LlmModelCard: React.FC<LlmModelCardProps> = ({
  modelName,
  binary,
  likertScale,
  probability,
}) => {
  console.log(binary);
  return (
    <div
      className="flex flex-col gap-4 bg-blue-50 shadow-md p-4 rounded-lg"
      aria-label="Model Card"
    >
      <span className="font-bold text-lg">{modelName}</span>
      <div className="flex flex-col text-sm">
        <div>
          The paper should be{" "}
          <span className="font-bold">
            {binary === "Include" ? "included" : "excluded"}
          </span>
          .<br />
          <br />
          The paper scored{" "}
          <b>
            {likertScale} ({likertMap[likertScale]})
          </b>{" "}
          on the Likert-scale <br />
          (1-7) for inclusion.
          <br />
          <br />
          There is a <b>{probability * 100}%</b> probability that the paper is
          relevant for inclusion.
        </div>
        <div className="hidden">
          <div className="whitespace-nowrap">
            <span className="text-sm font-semibold">Binary: </span>
            <span className="text-sm">{binary}</span>
          </div>
          <div className="whitespace-nowrap">
            <span className="text-sm font-semibold">Likert-scale (1-7): </span>
            <span className="text-sm">{likertScale}</span>
          </div>
          <div className="whitespace-nowrap">
            <span className="text-sm font-semibold">Probability: </span>
            <span className="text-sm">{probability}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
