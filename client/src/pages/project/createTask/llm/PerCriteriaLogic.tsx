type PerCriteriaLogicProps = {
  inclusionExpression?: string | null;
  exclusionExpression?: string | null;
};

/** How per-criterion answers combine into a decision, as set on the project. */
export const PerCriteriaLogic: React.FC<PerCriteriaLogicProps> = ({
  inclusionExpression,
  exclusionExpression,
}) => (
  <div className="w-full flex flex-col gap-1 border border-slate-200 rounded-lg p-3">
    <div className="text-xs font-semibold text-slate-600 mb-1">Per-criteria logic</div>
    <div className="flex justify-between text-xs text-slate-500">
      <span>Inclusion:</span>
      <span className="font-mono font-medium text-slate-700">
        {inclusionExpression ?? "default (AND)"}
      </span>
    </div>
    <div className="flex justify-between text-xs text-slate-500">
      <span>Exclusion:</span>
      <span className="font-mono font-medium text-slate-700">
        {exclusionExpression ?? "default (OR)"}
      </span>
    </div>
  </div>
);
