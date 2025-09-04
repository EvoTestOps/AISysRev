type LlmModelCardProps = {
  modelName: string;
  binary: string;
  likertScale: number;
  probability: number;
};

const likertMap: Record<number, string> = {
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
      <div>
        <div className="whitespace-nowrap">
          <span className="text-sm font-semibold">Binary: </span>
          <span className="text-sm">{binary}</span>
        </div>
        <div className="hidden">
          <div className="whitespace-nowrap">
            <span className="text-sm font-semibold">Binary: </span>
            <span className="text-sm">{binary}</span>
          </div>
          <div className="break-words">
            <span className="text-sm font-semibold">Likert (include): </span>
            <span className="text-sm break-words">
              {likertScale} ({likertMap[likertScale]})
            </span>
          </div>
          <div className="whitespace-nowrap">
            <span className="text-sm font-semibold">
              Probability (include):{" "}
            </span>
            <span className="text-sm">{probability * 100}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
