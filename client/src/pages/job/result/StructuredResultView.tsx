import {
  Criterion,
  Decision,
  JevCriterion,
  JevDecision,
  JevStructuredResponse,
  StructuredResponse,
} from "../../../services/api/client";
import { criterionId, criterionText, formatProbability } from "../taskResult";
import { DecisionPill } from "./DecisionPill";

const LIKERT_LABELS: Record<string, string> = {
  "1": "Strongly disagree",
  "2": "Disagree",
  "3": "Somewhat disagree",
  "4": "Neither agree or disagree",
  "5": "Somewhat agree",
  "6": "Agree",
  "7": "Strongly agree",
};

// Jev decisions have no Likert value.
const likertOf = (decision: Decision | JevDecision) =>
  "likert_decision" in decision ? decision.likert_decision : null;

const likertLabel = (likert: string) => `${likert} (${LIKERT_LABELS[likert] ?? "?"})`;

type ProjectCriteria = { inclusion_criteria: string[]; exclusion_criteria: string[] };

type CriteriaTableProps = {
  title: string;
  criteria: (Criterion | JevCriterion)[];
  projectCriteria: ProjectCriteria;
  showLikert: boolean;
};

const CriteriaTable: React.FC<CriteriaTableProps> = ({
  title,
  criteria,
  projectCriteria,
  showLikert,
}) => (
  <div className="flex flex-col gap-2">
    <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
    {criteria.length === 0 ? (
      <p className="text-xs text-slate-500">None.</p>
    ) : (
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
            <th className="py-1 pr-2 w-14">ID</th>
            <th className="py-1 pr-2 w-24">Met</th>
            <th className="py-1 pr-2 w-24">Probability</th>
            {showLikert && <th className="py-1 pr-2 w-44">Likert</th>}
            <th className="py-1">Reason</th>
          </tr>
        </thead>
        <tbody>
          {criteria.map((criterion) => {
            const id = criterionId(criterion.name);
            const text = criterionText(id, projectCriteria);
            const likert = likertOf(criterion.decision);
            return (
              <tr
                key={criterion.name}
                className="border-b border-slate-100 align-top"
                data-testid={`task-criterion-${id}`}
              >
                <td className="py-2 pr-2 font-semibold" title={text}>
                  {id}
                </td>
                <td className="py-2 pr-2">
                  <DecisionPill
                    value={criterion.decision.binary_decision}
                    labels={["Met", "Not met"]}
                  />
                </td>
                <td className="py-2 pr-2 font-mono">
                  {formatProbability(criterion.decision.probability_decision)}
                </td>
                {showLikert && (
                  <td className="py-2 pr-2 text-xs">{likert ? likertLabel(likert) : "–"}</td>
                )}
                <td className="py-2">
                  {text && <div className="text-xs text-slate-500 mb-1">{text}</div>}
                  <div className="whitespace-pre-wrap">{criterion.decision.reason}</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    )}
  </div>
);

type StructuredResultViewProps = {
  result: StructuredResponse | JevStructuredResponse;
  projectCriteria: ProjectCriteria;
};

/** An LLM's (or Jev's) decision on the paper and on each criterion. */
export const StructuredResultView: React.FC<StructuredResultViewProps> = ({
  result,
  projectCriteria,
}) => {
  const overall = result.overall_decision;
  const overallLikert = likertOf(overall);
  const showLikert = [...result.inclusion_criteria, ...result.exclusion_criteria].some(
    (criterion) => likertOf(criterion.decision) != null,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2" data-testid="task-overall-decision">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <DecisionPill value={overall.binary_decision} labels={["Include", "Exclude"]} />
          <span>
            Probability of inclusion:{" "}
            <span className="font-mono font-semibold">
              {formatProbability(overall.probability_decision)}
            </span>
          </span>
          {overallLikert && <span>Likert: {likertLabel(overallLikert)}</span>}
        </div>
        <p className="text-sm whitespace-pre-wrap">{overall.reason}</p>
      </div>
      <CriteriaTable
        title="Inclusion criteria"
        criteria={result.inclusion_criteria}
        projectCriteria={projectCriteria}
        showLikert={showLikert}
      />
      <CriteriaTable
        title="Exclusion criteria"
        criteria={result.exclusion_criteria}
        projectCriteria={projectCriteria}
        showLikert={showLikert}
      />
    </div>
  );
};
