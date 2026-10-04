import { useLocation, useParams } from "wouter";
import { useEffect, useId, useMemo, useState } from "react";
import { Layout } from "../components/Layout";
import { useTypedStoreActions, useTypedStoreState } from "../state/store";
import { ProjectTabs } from "../components/ProjectTabs";
import { NotFoundPage } from "./NotFound";
import { Card } from "../components/Card";
import { CriteriaList } from "../components/CriteriaList";
import { H6 } from "../components/Typography";
import { PaperCard } from "../components/PaperCard";
import { getPaperSortFunction, SortOption } from "../helpers/sort";
import { PaperListHeader } from "../components/paperList/PaperListHeader";
import { PaginationBar } from "../components/paperList/PaginationBar";
import { paginate } from "../components/paperList/pagination";
import { AlertMessage } from "../components/AlertMessage";
import { ScreeningTarget } from "../state/types";

export const PapersPage = () => {
  const params = useParams<{ projectUuid: string; page?: string }>();
  const { projectUuid } = params;

  const currentPage = Number(params.page ?? 1);

  const id = useId();

  const [, setLocation] = useLocation();

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

  const screeningTarget = project?.screening_target ?? ScreeningTarget.PAPER;
  const isGithubScreening = screeningTarget === ScreeningTarget.GITHUB_REPOSITORY;
  const itemNamePlural = isGithubScreening ? "repositories" : "papers";

  const getPapersForProject = useTypedStoreState(
    (state) => state.getPapersForProject
  );
  const papers = getPapersForProject(projectUuid);

  const fetchPapers = useTypedStoreActions((actions) => actions.fetchPapers);

  const [hideAlreadyEvaluatedPapers, sethideAlreadyEvaluatedPapers] =
    useState(true);
  const [sortOption, setSortOption] = useState<SortOption>("ID_ASC");

  const sortedPapers = useMemo(
    () =>
      [...papers].sort(
        getPaperSortFunction(sortOption, (paper) => paper.avg_probability_decision)
      ),
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
  const { pageItems: currentPapers, pageCount } = paginate(
    sortedAndFilteredPapers,
    currentPage
  );

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
        <ProjectTabs
          projectUuid={projectUuid}
          active="papers"
          itemNamePlural={itemNamePlural}
        />
        <div className="p-4 flex flex-row gap-2">
          <input
            type="checkbox"
            id={`${id}-filter_out_evaluated`}
            data-testid="input-filter_out_evaluated"
            checked={hideAlreadyEvaluatedPapers}
            onChange={() => {
              sethideAlreadyEvaluatedPapers(!hideAlreadyEvaluatedPapers);
            }}
          />
          <label
            htmlFor={`${id}-filter_out_evaluated`}
            data-testid="label-filter_out_evaluated"
            className="font-semibold select-none"
          >
            Hide already evaluated {itemNamePlural} ({alreadyEvaluatedPapers})
          </label>
        </div>
        <div className="grid grid-cols-[1fr_350px] gap-2">
          <div className="flex flex-col gap-2">
            <PaperListHeader
              sortOption={sortOption}
              onSortChange={setSortOption}
            />
            <div className="flex flex-col gap-1">
              {!loadingPapers &&
                currentPapers.map((paper) => (
                  <PaperCard
                    key={paper.uuid}
                    paper={paper}
                    isGithubScreening={isGithubScreening}
                    data-testid={`paper-${paper.paper_id}`}
                  />
                ))}
            </div>
            {!loadingPapers &&
              sortedAndFilteredPapers &&
              sortedAndFilteredPapers.length === 0 && (
                <AlertMessage
                  className="p-4"
                  data-testid="no-papers-text"
                  message={`No ${itemNamePlural}.`}
                />
              )}
            {!loadingPapers && (
              <PaginationBar
                currentPage={currentPage}
                pageCount={pageCount}
                onPageChange={(page) =>
                  setLocation(`/project/${projectUuid}/papers/page/${page}`)
                }
              />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="sticky top-2 h-16 flex items-center content-center p-4 bg-slate-800 text-white rounded-lg">
              <H6>Inclusion and exclusion criteria</H6>
            </div>
            <Card className="sticky top-20">
              <H6>Inclusion criteria</H6>
              <CriteriaList
                data-testid="inclusion-criteria"
                criteria={project.criteria.inclusion_criteria || []}
              />
              <H6>Exclusion criteria</H6>
              <CriteriaList
                data-testid="exclusion-criteria"
                criteria={project.criteria.exclusion_criteria || []}
              />
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};
