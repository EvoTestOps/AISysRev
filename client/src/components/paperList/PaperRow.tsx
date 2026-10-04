import classNames from "classnames";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";
import { Card, CardProps } from "../Card";

type PaperRowProps = {
  paperId: number | null | undefined;
  title: string;
  hasFullText: boolean;
  /** The probability column: a value, or a status such as "Pending". */
  value: React.ReactNode;
  /** Greys out `value`, e.g. while there is no result yet. */
  valueMuted?: boolean;
  open: boolean;
  onToggle: () => void;
  /** Shown below the row while it is open. */
  children?: React.ReactNode;
};

/** One row of a list of papers, expandable to show more about the paper. */
export const PaperRow: React.FC<React.PropsWithChildren<CardProps> & PaperRowProps> = ({
  paperId,
  title,
  hasFullText,
  value,
  valueMuted = false,
  open,
  onToggle,
  children,
  ...rest
}) => (
  <Card {...rest} padding="p-0">
    <button
      className="rounded-lg p-4 grid grid-cols-[60px_1fr_240px_30px] items-center content-center hover:cursor-pointer hover:bg-gray-50"
      onClick={onToggle}
    >
      <div className="text-sm font-semibold select-none text-left">{paperId}</div>
      <div
        className="text-sm font-semibold select-none text-left flex items-center gap-1.5"
        title={title}
      >
        {hasFullText && (
          <FileText size={14} className="text-teal-600 shrink-0" aria-label="Full text attached" />
        )}
        <span className="truncate">
          {title.length > 80 ? title.substring(0, 77) + "..." : title}
        </span>
      </div>
      <div
        className={classNames("text-center text-sm select-none", {
          "text-gray-400": valueMuted,
        })}
      >
        {value}
      </div>
      <div className="hover:cursor-pointer">{open ? <ChevronUp /> : <ChevronDown />}</div>
    </button>
    {open && <div className="pl-4 pr-4 pb-4">{children}</div>}
  </Card>
);
