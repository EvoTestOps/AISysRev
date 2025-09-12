import { useLocation, useParams } from "wouter";
import ReactPaginate from "react-paginate";
import classNames from "classnames";
import { twMerge } from "tailwind-merge";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Layout } from "../components/Layout";
import { useTypedStoreState } from "../state/store";
import { TabButton } from "../components/TabButton";
import { NotFoundPage } from "./NotFound";
import { JobTaskHumanResult, Paper, PaperWithModelEval } from "../state/types";
import {
  addPaperHumanResult,
  fetchPapersWithModelEvalsForProject,
} from "../services/paperService";
import { Card, CardProps } from "../components/Card";
import {
  Check,
  ChevronDown,
  ChevronUp,
  CircleQuestionMark,
  X,
} from "lucide-react";
import { Button } from "../components/Button";
import { CriteriaList } from "../components/CriteriaList";
import { H6 } from "../components/Typography";

type SortOption =
  | "ID_ASC"
  | "ID_DESC"
  | "INCLUDE_ASC"
  | "INCLUDE_DESC"
  | "NAME_ASC"
  | "NAME_DESC";

function sort_name_asc(paperA: PaperWithModelEval, paperB: PaperWithModelEval) {
  return paperA.title.localeCompare(paperB.title);
}
function sort_name_desc(
  paperA: PaperWithModelEval,
  paperB: PaperWithModelEval
) {
  return paperB.title.localeCompare(paperA.title);
}

function sort_id_asc(paperA: PaperWithModelEval, paperB: PaperWithModelEval) {
  return paperA.paper_id - paperB.paper_id;
}

function sort_id_desc(paperA: PaperWithModelEval, paperB: PaperWithModelEval) {
  return paperB.paper_id - paperA.paper_id;
}

function sort_include_asc(
  paperA: PaperWithModelEval,
  paperB: PaperWithModelEval
) {
  const a = paperA.avg_probability_decision;
  const b = paperB.avg_probability_decision;

  if (a === undefined && b === undefined) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;

  return a - b;
}
function sort_include_desc(
  paperA: PaperWithModelEval,
  paperB: PaperWithModelEval
) {
  const a = paperA.avg_probability_decision;
  const b = paperB.avg_probability_decision;

  if (a === undefined && b === undefined) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;

  return b - a;
}

function get_sorter_fn(opt: SortOption) {
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
}

type PaperCardProps = {
  paper: PaperWithModelEval;
};

const PaperCard: React.FC<
  React.PropsWithChildren<CardProps> & PaperCardProps
> = ({ paper, ...rest }) => {
  const [open, setOpen] = useState(false);

  const addHumanResult = useCallback(
    async (paperUuid: string, humanResult: JobTaskHumanResult) => {
      try {
        await addPaperHumanResult(paperUuid, humanResult);
      } catch (error) {
        console.error("Error adding human result:", error);
      }
    },
    []
  );

  return (
    <Card {...rest} padding="p-0">
      <div
        className={twMerge(
          classNames(
            "rounded-lg p-4 grid grid-cols-[60px_1fr_240px_30px] items-center content-center hover:cursor-pointer hover:bg-gray-50"
          )
        )}
        onClick={() => {
          setOpen(!open);
        }}
      >
        <div className="text-sm font-semibold select-none">
          {paper.paper_id}
        </div>
        <div className="text-sm font-semibold select-none" title={paper.title}>
          {paper.title.length > 80
            ? paper.title.substring(0, 77) + "..."
            : paper.title}
        </div>
        <div className="text-center text-sm select-none">
          {paper.avg_probability_decision
            ? paper.avg_probability_decision.toFixed(3)
            : "Not available"}
        </div>
        <div>
          {!open && (
            <ChevronDown
              className="hover:cursor-pointer"
              onClick={() => {
                setOpen(true);
              }}
            />
          )}
          {open && (
            <ChevronUp
              className="hover:cursor-pointer"
              onClick={() => {
                setOpen(false);
              }}
            />
          )}
        </div>
      </div>
      {open && (
        <div className="pl-4 pr-4 pb-4">
          <div className="text-xs mb-4 bg-slate-200 rounded-md font-mono p-2">
            {paper.abstract}
          </div>
          {paper.human_result === null && (
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                variant="red"
                size="xs"
                onClick={() => {
                  addHumanResult(paper.uuid, JobTaskHumanResult.EXCLUDE);
                }}
              >
                <div className="flex flex-row gap-2 items-center font-semibold">
                  <X size={15} />
                  <span className="select-none">Exclude</span>
                </div>
              </Button>
              <Button
                variant="yellow"
                size="xs"
                onClick={() => {
                  addHumanResult(paper.uuid, JobTaskHumanResult.UNSURE);
                }}
              >
                <div className="flex flex-row gap-2 items-center font-semibold">
                  <CircleQuestionMark size={15} />
                  <span className="select-none">Unsure</span>
                </div>
              </Button>
              <Button
                variant="green"
                size="xs"
                onClick={() => {
                  addHumanResult(paper.uuid, JobTaskHumanResult.INCLUDE);
                }}
              >
                <div className="flex flex-row gap-2 items-center font-semibold">
                  <Check size={15} />
                  <span className="select-none">Include</span>
                </div>
              </Button>
            </div>
          )}
          {paper.human_result !== null && (
            <div className="flex flex-wrap justify-center gap-2">
              Your evaluation: <strong>{paper.human_result}</strong>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export const PapersPage = () => {
  const params = useParams<{ uuid: string; page?: string }>();
  const uuid = params.uuid;
  const p = Number(params.page ?? 1);

  const [, setLocation] = useLocation();

  const papersPerPage = 25;

  const loadingProjects = useTypedStoreState((state) => state.loading.projects);
  const getProjectByUuid = useTypedStoreState(
    (state) => state.getProjectByUuid
  );
  const project = getProjectByUuid(uuid);

  const [papers, setPapers] = useState<Paper[]>([]);
  const [hideAlreadyEvaluatedPapers, sethideAlreadyEvaluatedPapers] =
    useState(true);
  const [sortOption, setSortOption] = useState<SortOption>("ID_ASC");

  const itemOffset = ((p - 1) * papersPerPage) % papers.length;

  const endOffset = itemOffset + papersPerPage;
  const pageCount = Math.ceil(papers.length / papersPerPage);

  const sortedPapers = useMemo(
    () => [...papers].sort(get_sorter_fn(sortOption)),
    [papers, sortOption]
  );
  const alreadyEvaluatedPapers = useMemo(
    () => [...papers].filter((p) => p.human_result !== null).length,
    [papers]
  );
  const sortedAndFilteredPapers = useMemo(
    () =>
      [...sortedPapers].filter((paper) => {
        if (!hideAlreadyEvaluatedPapers) {
          return true;
        }
        return paper.human_result === null;
      }),
    [hideAlreadyEvaluatedPapers, sortedPapers]
  );

  const currentItems = sortedAndFilteredPapers.slice(itemOffset, endOffset);

  useEffect(() => {
    async function fetchPapers() {
      const papers: Paper[] = await fetchPapersWithModelEvalsForProject(uuid);
      return papers;
    }
    if (project !== undefined) {
      fetchPapers().then((papers) => setPapers(papers));
    }
  }, [project, uuid]);

  if (loadingProjects) {
    return null;
  }
  if (project === undefined) {
    return <NotFoundPage />;
  }

  return (
    <Layout title={project.name}>
      <div>
        <div className="flex flex-row mb-4">
          <TabButton href={`/project/${params.uuid}`}>
            Screening tasks
          </TabButton>
          <TabButton href={`/project/${params.uuid}/papers/page/1`} active>
            List of papers
          </TabButton>
        </div>
        <div className="p-4 flex flex-row gap-2">
          <input
            type="checkbox"
            id="filter_out_evaluated"
            checked={hideAlreadyEvaluatedPapers}
            onChange={() => {
              sethideAlreadyEvaluatedPapers(!hideAlreadyEvaluatedPapers);
            }}
          />
          <label htmlFor="filter_out_evaluated" className="font-semibold select-none">
            Hide already evaluated papers ({alreadyEvaluatedPapers})
          </label>
        </div>
        <div className="grid grid-cols-[1fr_350px] gap-2">
          <div className="flex flex-col">
            <div className="grid grid-cols-[60px_1fr_240px_30px] p-4 h-16">
              <div
                className="flex flex-row gap-1 items-center content-center justify-start hover:cursor-pointer"
                onClick={() => {
                  if (sortOption === "ID_ASC") {
                    setSortOption("ID_DESC");
                  } else {
                    setSortOption("ID_ASC");
                  }
                }}
              >
                <span className="font-bold select-none">ID</span>
                {sortOption === "ID_ASC" && <ChevronDown />}
                {sortOption === "ID_DESC" && <ChevronUp />}
              </div>
              <div
                className="flex flex-row gap-1 items-center content-center hover:cursor-pointer"
                onClick={() => {
                  if (sortOption === "NAME_ASC") {
                    setSortOption("NAME_DESC");
                  } else {
                    setSortOption("NAME_ASC");
                  }
                }}
              >
                <span className="font-bold select-none">Name</span>
                {sortOption === "NAME_ASC" && <ChevronDown />}
                {sortOption === "NAME_DESC" && <ChevronUp />}
              </div>
              <div
                className="flex flex-row gap-1 items-center content-center justify-center hover:cursor-pointer"
                onClick={() => {
                  if (sortOption === "INCLUDE_ASC") {
                    setSortOption("INCLUDE_DESC");
                  } else {
                    setSortOption("INCLUDE_ASC");
                  }
                }}
              >
                <span className="font-bold select-none">
                  Probability of inclusion
                </span>
                {sortOption === "INCLUDE_ASC" && <ChevronDown />}
                {sortOption === "INCLUDE_DESC" && <ChevronUp />}
              </div>
              <div></div>
            </div>
            <div className="flex flex-col gap-1">
              {currentItems.map((paper) => (
                <PaperCard key={paper.uuid} paper={paper} />
              ))}
            </div>
            {sortedAndFilteredPapers &&
              sortedAndFilteredPapers.length === 0 && (
                <div className="p-4 text-md text-gray-600">No papers.</div>
              )}
            {sortedAndFilteredPapers &&
              sortedAndFilteredPapers.length > papersPerPage && (
                <Card className="flex shadow-lg bg-slate-800 justify-center mt-12 sticky bottom-6">
                  <ReactPaginate
                    onPageChange={(item) =>
                      setLocation(
                        `/project/${uuid}/papers/page/${item.selected + 1}`
                      )
                    }
                    breakLabel="..."
                    nextLabel=">"
                    previousLabel="<"
                    pageRangeDisplayed={5}
                    pageCount={pageCount}
                    renderOnZeroPageCount={null}
                    containerClassName="flex items-center gap-2 items-center content-center justify-center select-none"
                    pageClassName="text-white flex items-center justify-center rounded-full w-10 h-10 border border-white hover:bg-slate-600 hover:cursor-pointer"
                    activeClassName="bg-slate-600 hover:cursor-normal"
                    previousClassName="flex items-center justify-center rounded-full w-10 h-10 border border-white text-white hover:bg-slate-600 hover:cursor-pointer"
                    nextClassName="flex items-center justify-center rounded-full w-10 h-10 border border-white text-white hover:bg-slate-600 hover:cursor-pointer"
                    breakClassName="flex items-center justify-center w-10 h-10 text-white hover:cursor-pointer"
                    forcePage={p - 1}
                  />
                </Card>
              )}
          </div>
          <div>
            <div className="h-16" />
            {/* Spacer */}
            <Card className="sticky top-2">
              <H6>Inclusion criteria</H6>
              <CriteriaList
                criteria={project.criteria.inclusion_criteria || []}
              />
              <H6>Exclusion criteria</H6>
              <CriteriaList
                criteria={project.criteria.exclusion_criteria || []}
              />
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};
