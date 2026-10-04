import classNames from "classnames";

type DecisionPillProps = {
  value: boolean | null | undefined;
  /** Labels for true and false, e.g. Include / Exclude or Met / Not met. */
  labels: [string, string];
};

export const DecisionPill: React.FC<DecisionPillProps> = ({ value, labels }) => (
  <span
    className={classNames("inline-block rounded-full px-2 py-0.5 text-xs font-semibold", {
      "bg-green-100 text-green-800": value === true,
      "bg-red-100 text-red-800": value === false,
      "bg-slate-100 text-slate-500": value == null,
    })}
  >
    {value == null ? "–" : value ? labels[0] : labels[1]}
  </span>
);
