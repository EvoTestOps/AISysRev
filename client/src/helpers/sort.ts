import { PaperWithModelEval } from "../state/types";

export type SortOption =
  | "ID_ASC"
  | "ID_DESC"
  | "INCLUDE_ASC"
  | "INCLUDE_DESC"
  | "NAME_ASC"
  | "NAME_DESC";

const sort_name_asc = (
  paperA: PaperWithModelEval,
  paperB: PaperWithModelEval
) => paperA.title.localeCompare(paperB.title);

const sort_name_desc = (
  paperA: PaperWithModelEval,
  paperB: PaperWithModelEval
) => paperB.title.localeCompare(paperA.title);

const sort_id_asc = (paperA: PaperWithModelEval, paperB: PaperWithModelEval) =>
  paperA.paper_id - paperB.paper_id;

const sort_id_desc = (paperA: PaperWithModelEval, paperB: PaperWithModelEval) =>
  paperB.paper_id - paperA.paper_id;

const sort_include_asc = (
  paperA: PaperWithModelEval,
  paperB: PaperWithModelEval
) => {
  const a = paperA.avg_probability_decision;
  const b = paperB.avg_probability_decision;

  if (a === undefined && b === undefined) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;

  return a - b;
};

const sort_include_desc = (
  paperA: PaperWithModelEval,
  paperB: PaperWithModelEval
) => {
  const a = paperA.avg_probability_decision;
  const b = paperB.avg_probability_decision;

  if (a === undefined && b === undefined) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;

  return b - a;
};

export const getPaperSortFunction = (opt: SortOption) => {
  switch (opt) {
    case "ID_ASC":
      return sort_id_asc;
    case "ID_DESC":
      return sort_id_desc;
    case "INCLUDE_ASC":
      return sort_include_asc;
    case "INCLUDE_DESC":
      return sort_include_desc;
    case "NAME_ASC":
      return sort_name_asc;
    case "NAME_DESC":
      return sort_name_desc;
    default:
      throw new Error("Should not happen");
  }
};
