import { JobPromptingType, JobScreeningMode, PromptingConfig } from "../state/types";
import { Badge } from "./Badge";

type LlmModelCardProps = {
  modelName: string;
  binary: string | null;
  likertScale: string | null;
  probability: number | null;
  screeningType: PromptingConfig["screening_type"];
  screeningMode: JobScreeningMode | null;
};

const likertMap: Record<string, string> = {
  "1": "Strongly disagree",
  "2": "Disagree",
  "3": "Somewhat disagree",
  "4": "Neither agree nor disagree",
  "5": "Somewhat agree",
  "6": "Agree",
  "7": "Strongly agree",
};

export const LlmModelCard: React.FC<LlmModelCardProps> = ({
  modelName,
  binary,
  likertScale,
  probability,
  screeningType,
  screeningMode,
}) => {
  // console.log(binary);
  return (
    <div
      className="flex flex-col gap-4 bg-blue-50 shadow-md p-4 rounded-lg"
      aria-label="Model Card"
    >
      <div className="font-bold text-lg flex flex-col gap-2 items-start content-center">
        <div className="flex items-center gap-2">
        {screeningType == JobPromptingType.ZERO_SHOT && (
          <Badge text="ZS" invert />
        )}
        {screeningType == JobPromptingType.FEW_SHOT && (
          <Badge text="FS" invert />
        )}
          <span className="text-xs font-normal text-slate-500">
            {screeningMode === JobScreeningMode.TEXT && "Abstract"}
            {screeningMode === JobScreeningMode.PDF && "PDF"}
            {screeningMode === JobScreeningMode.AUTOMATIC && "Automatic"}
          </span>
        </div>
        {modelName}
      </div>
      <div>
        <div className="whitespace-nowrap">
          <span className="text-sm font-semibold">Binary: </span>
          <span className="text-sm">
            {binary ? (
              binary
            ) : (
              <span className="text-red-700 font-semibold">Error</span>
            )}
          </span>
        </div>
        <div className="wrap-break-word">
          <span className="text-sm font-semibold">Likert (include): </span>
          <span className="text-sm wrap-break-word">
            {likertScale ? (
              likertScale
            ) : (
              <span className="text-red-700 font-semibold">Error</span>
            )}{" "}
            {likertScale && <>({likertMap[likertScale]})</>}
          </span>
        </div>
        <div className="whitespace-nowrap">
          <span className="text-sm font-semibold">Probability (include): </span>
          <span className="text-sm">
            {probability ? (
              <>{probability * 100} %</>
            ) : (
              <span className="text-red-700 font-semibold">Error</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};
