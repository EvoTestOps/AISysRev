import { useLocation, useParams } from "wouter";
import ReactPaginate from "react-paginate";
import { useEffect, useMemo, useState } from "react";
import { Layout } from "../components/Layout";
import { useTypedStoreActions, useTypedStoreState } from "../state/store";
import { TabButton } from "../components/TabButton";
import { NotFoundPage } from "./NotFound";
import { Card } from "../components/Card";
import { ChevronDown, ChevronUp } from "lucide-react";
import { CriteriaList } from "../components/CriteriaList";
import { H6 } from "../components/Typography";
import { PaperCard } from "../components/PaperCard";
import { getPaperSortFunction, SortOption } from "../helpers/sort";

export const PapersPage = () => {
  const params = useParams<{ uuid: string; page?: string }>();
  const projectUuid = params.uuid;
  const currentPage = Number(params.page ?? 1);

  const [, setLocation] = useLocation();

  const papersPerPage = 25;

  const loadingProjects = useTypedStoreState((state) => state.loading.projects);

  // TODO: Use computed value
  const loadingPapers = useTypedStoreState((state) =>
    state.loading.papers[projectUuid] === undefined
      ? true
      : state.loading.papers[projectUuid]
  );

  const getProjectByUuid = useTypedStoreState(
    (state) => state.getProjectByUuid
  );
  const project = getProjectByUuid(projectUuid);

  const getPapersForProject = useTypedStoreState(
    (state) => state.getPapersForProject
  );
  const papers = getPapersForProject(projectUuid);

  const fetchPapers = useTypedStoreActions((actions) => actions.fetchPapers);

  const [hideAlreadyEvaluatedPapers, sethideAlreadyEvaluatedPapers] =
    useState(true);
  const [sortOption, setSortOption] = useState<SortOption>("ID_ASC");

  const itemOffset = ((currentPage - 1) * papersPerPage) % papers.length;

  const endOffset = itemOffset + papersPerPage;
  const pageCount = Math.ceil(papers.length / papersPerPage);

  const sortedPapers = useMemo(
    () => [...papers].sort(getPaperSortFunction(sortOption)),
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

  // TODO: Memoize & Redux
  const currentPapers = sortedAndFilteredPapers.slice(itemOffset, endOffset);

  useEffect(() => {
    if (project !== undefined) {
      fetchPapers(projectUuid);
    }
  }, [fetchPapers, project, projectUuid]);

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
          <label
            htmlFor="filter_out_evaluated"
            className="font-semibold select-none"
          >
            Hide already evaluated papers ({alreadyEvaluatedPapers})
          </label>
        </div>
        <div className="grid grid-cols-[1fr_350px] gap-2">
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[60px_1fr_240px_30px] p-4 h-16 rounded-lg bg-slate-800 text-white">
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
              {!loadingPapers &&
                currentPapers.map((paper) => (
                  <PaperCard key={paper.uuid} paper={paper} />
                ))}
            </div>
            {!loadingPapers &&
              sortedAndFilteredPapers &&
              sortedAndFilteredPapers.length === 0 && (
                <div className="p-4 text-md text-gray-600">No papers.</div>
              )}
            {!loadingPapers &&
              sortedAndFilteredPapers &&
              sortedAndFilteredPapers.length > papersPerPage && (
                <Card className="flex shadow-lg bg-slate-800 justify-center mt-12 sticky bottom-6">
                  <ReactPaginate
                    onPageChange={(item) =>
                      setLocation(
                        `/project/${projectUuid}/papers/page/${
                          item.selected + 1
                        }`
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
                    forcePage={currentPage - 1}
                  />
                </Card>
              )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="sticky top-2 h-16 flex items-center content-center p-4 bg-slate-800 text-white rounded-lg">
              <H6>Inclusion and exclusion criteria</H6>
            </div>
            <Card className="sticky top-20">
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
