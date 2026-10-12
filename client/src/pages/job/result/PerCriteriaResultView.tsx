import { PerCriteriaResult } from "../../../services/api/client";
import { criterionText, formatProbability } from "../taskResult";
import { DecisionPill } from "./DecisionPill";

type PerCriteriaResultViewProps = {
  result: PerCriteriaResult;
  projectCriteria: { inclusion_criteria: string[]; exclusion_criteria: string[] };
};

const Aggregate: React.FC<{ label: string; value: number | null | undefined }> = ({
  label,
  value,
}) => (
  <span>
    {label}: <span className="font-mono font-semibold">{formatProbability(value)}</span>
  </span>
);

/**
 * One LLM call's answer per criterion, and the probabilities combined from
 * them with the project's per-criteria logic.
 */
export const PerCriteriaResultView: React.FC<PerCriteriaResultViewProps> = ({
  result,
  projectCriteria,
}) => (
  <div className="flex flex-col gap-6">
    <div className="flex flex-wrap items-center gap-4 text-sm" data-testid="task-overall-decision">
      <DecisionPill value={result.binary_decision} labels={["Include", "Exclude"]} />
      <Aggregate label="Overall" value={result.overall_probability} />
      <Aggregate label="Inclusion" value={result.inclusion_probability} />
      <Aggregate label="Exclusion" value={result.exclusion_probability} />
    </div>
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
          <th className="py-1 pr-2 w-14">ID</th>
          <th className="py-1 pr-2 w-24">Probability</th>
          <th className="py-1">Reason</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(result.criterion_results).map(([id, answer]) => {
          const text = criterionText(id, projectCriteria);
          return (
            <tr
              key={id}
              className="border-b border-slate-100 align-top"
              data-testid={`task-criterion-${id}`}
            >
              <td className="py-2 pr-2 font-semibold" title={text}>
                {id}
              </td>
              <td className="py-2 pr-2 font-mono">
                {"error" in answer ? "–" : formatProbability(answer.probability_decision)}
              </td>
              <td className="py-2">
                {text && <div className="text-xs text-slate-500 mb-1">{text}</div>}
                {"error" in answer ? (
                  <div className="text-red-700">Failed: {answer.error}</div>
                ) : (
                  <div className="whitespace-pre-wrap">{answer.reason}</div>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);
