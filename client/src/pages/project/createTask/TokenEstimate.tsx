import Tooltip from "@mui/material/Tooltip";
import { Info } from "lucide-react";
import { TokenEstimation } from "../../../state/types";

const fmt = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const Row: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="flex justify-between text-xs text-slate-500">
    <span>{label}</span>
    <span className="font-mono font-medium text-slate-700">~{fmt.format(value)}</span>
  </div>
);

export const TokenEstimate: React.FC<{ estimation: TokenEstimation }> = ({ estimation }) => (
  <div className="w-full flex flex-col gap-1 border border-slate-200 rounded-lg p-3">
    <div className="flex items-center gap-1.5 mb-1">
      <span className="text-xs font-semibold text-slate-600">Estimated usage</span>
      <Tooltip title="Values are approximate estimates.">
        <Info size={13} className="text-slate-400 cursor-help" />
      </Tooltip>
    </div>
    <Row label="Input tokens:" value={estimation.estimated_input_tokens} />
    {estimation.estimated_output_tokens !== null && (
      <Row label="Output tokens:" value={estimation.estimated_output_tokens} />
    )}
  </div>
);
