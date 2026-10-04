export type SortOption =
  | "ID_ASC"
  | "ID_DESC"
  | "INCLUDE_ASC"
  | "INCLUDE_DESC"
  | "NAME_ASC"
  | "NAME_DESC";

/** Anything listed like a paper: by its display id and title. */
export type PaperLike = { paper_id: number; title: string };

type Probability = number | null | undefined;

// A missing probability sorts last in both directions; null counts as 0.
const compareProbability = (a: Probability, b: Probability, direction: 1 | -1) => {
  if (a === undefined && b === undefined) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  return direction * ((a || 0) - (b || 0));
};

/**
 * A comparator for `opt`. `probabilityOf` reads the value the probability
 * columns sort by, e.g. a paper's average probability of inclusion.
 */
export const getPaperSortFunction = <T extends PaperLike>(
  opt: SortOption,
  probabilityOf: (item: T) => Probability,
): ((a: T, b: T) => number) => {
  switch (opt) {
    case "ID_ASC":
      return (a, b) => a.paper_id - b.paper_id;
    case "ID_DESC":
      return (a, b) => b.paper_id - a.paper_id;
    case "INCLUDE_ASC":
      return (a, b) => compareProbability(probabilityOf(a), probabilityOf(b), 1);
    case "INCLUDE_DESC":
      return (a, b) => compareProbability(probabilityOf(a), probabilityOf(b), -1);
    case "NAME_ASC":
      return (a, b) => a.title.localeCompare(b.title);
    case "NAME_DESC":
      return (a, b) => b.title.localeCompare(a.title);
    default:
      throw new Error("Should not happen");
  }
};
