import { ChevronDown, ChevronUp } from "lucide-react";
import { SortOption } from "../../helpers/sort";

type SortButtonProps = {
  label: string;
  testId: string;
  ascending: SortOption;
  descending: SortOption;
  sortOption: SortOption;
  onSortChange: (option: SortOption) => void;
  className: string;
};

const SortButton: React.FC<SortButtonProps> = ({
  label,
  testId,
  ascending,
  descending,
  sortOption,
  onSortChange,
  className,
}) => (
  <button
    className={`flex flex-row gap-1 items-center content-center hover:cursor-pointer ${className}`}
    data-testid={testId}
    onClick={() => onSortChange(sortOption === ascending ? descending : ascending)}
  >
    <span className="font-bold select-none">{label}</span>
    {sortOption === ascending && <ChevronDown />}
    {sortOption === descending && <ChevronUp />}
  </button>
);

type PaperListHeaderProps = {
  sortOption: SortOption;
  onSortChange: (option: SortOption) => void;
  probabilityLabel?: string;
};

/** The sticky, sortable header of a list of papers (ID, Name, probability). */
export const PaperListHeader: React.FC<PaperListHeaderProps> = ({
  sortOption,
  onSortChange,
  probabilityLabel = "Probability of inclusion",
}) => (
  <div className="grid grid-cols-[60px_1fr_240px_30px] p-4 h-16 rounded-lg bg-slate-800 text-white sticky top-2">
    <SortButton
      label="ID"
      testId="sort-by-id"
      ascending="ID_ASC"
      descending="ID_DESC"
      sortOption={sortOption}
      onSortChange={onSortChange}
      className="justify-start"
    />
    <SortButton
      label="Name"
      testId="sort-by-name"
      ascending="NAME_ASC"
      descending="NAME_DESC"
      sortOption={sortOption}
      onSortChange={onSortChange}
      className=""
    />
    <SortButton
      label={probabilityLabel}
      testId="sort-by-inclusion-probability"
      ascending="INCLUDE_ASC"
      descending="INCLUDE_DESC"
      sortOption={sortOption}
      onSortChange={onSortChange}
      className="justify-center"
    />
    <div></div>
  </div>
);
