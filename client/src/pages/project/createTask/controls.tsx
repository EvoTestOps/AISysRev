import Tooltip from "@mui/material/Tooltip";
import classNames from "classnames";
import { Info } from "lucide-react";

type FieldLabelProps = {
  label: string;
  tooltip?: string;
};

export const FieldLabel: React.FC<FieldLabelProps> = ({ label, tooltip }) => (
  <div className="flex items-center gap-1.5">
    <span className="text-sm font-medium text-slate-700">{label}</span>
    {tooltip && (
      <Tooltip title={tooltip}>
        <Info size={14} className="text-slate-400 cursor-help" />
      </Tooltip>
    )}
  </div>
);

type RadioCardProps = {
  testId: string;
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  iconClassName: string;
  title: string;
  description: React.ReactNode;
};

/** A large radio option with an icon, title and description. */
export const RadioCard: React.FC<RadioCardProps> = ({
  testId,
  selected,
  onSelect,
  icon,
  iconClassName,
  title,
  description,
}) => (
  <button
    type="button"
    data-testid={testId}
    onClick={onSelect}
    className={classNames(
      "flex items-center gap-3 p-3 rounded-lg border-2 text-left w-full transition-colors",
      {
        "border-blue-500 bg-blue-50/60": selected,
        "border-slate-200 bg-white hover:bg-slate-50": !selected,
      },
    )}
  >
    <div
      className={classNames(
        "w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center",
        { "border-blue-500": selected, "border-slate-300": !selected },
      )}
    >
      {selected && <div className="w-2 h-2 rounded-full bg-blue-500" />}
    </div>
    <div className={classNames("flex-shrink-0 p-1.5 rounded-md", iconClassName)}>{icon}</div>
    <div>
      <div className="text-sm font-semibold text-slate-800">{title}</div>
      <div className="text-xs text-slate-500">{description}</div>
    </div>
  </button>
);

type SegmentedButtonProps = {
  testId: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  children: React.ReactNode;
};

/** One button of a row of mutually exclusive options. */
export const SegmentedButton: React.FC<SegmentedButtonProps> = ({
  testId,
  selected,
  disabled = false,
  onSelect,
  children,
}) => (
  <button
    type="button"
    data-testid={testId}
    aria-pressed={selected}
    disabled={disabled}
    onClick={onSelect}
    className={classNames(
      "flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors",
      {
        "bg-blue-600 border-blue-600 text-white": selected,
        "border-slate-200 text-slate-700 bg-white hover:bg-slate-50": !selected && !disabled,
        "border-slate-100 text-slate-400 bg-slate-50 opacity-40 cursor-not-allowed": disabled,
      },
    )}
  >
    {children}
  </button>
);

type FieldGroupProps = {
  /** Dims the group and blocks input, e.g. until a model is selected. */
  disabled?: boolean;
  children: React.ReactNode;
};

export const FieldGroup: React.FC<FieldGroupProps> = ({ disabled = false, children }) => (
  <div
    className={classNames("flex flex-col gap-2 w-full", {
      "opacity-30 pointer-events-none": disabled,
    })}
  >
    {children}
  </div>
);
