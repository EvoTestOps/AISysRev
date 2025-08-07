type LlmModelCardProps = {
  modelName: string;
  binary: string;
  likertScale: number;
  probability: number;
};

export const LlmModelCard: React.FC<LlmModelCardProps> = ({ modelName, binary, likertScale, probability }) => {
  return (
    <div className="flex flex-col gap-4 bg-blue-50 shadow-md p-4 w-fit rounded-lg pr-20" aria-label="Model Card">
      <span className="font-bold">{modelName}</span>
      <div className="flex flex-col">
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
  )
}