import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { useLocation, useParams } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { Layout } from "../components/Layout";
import { FadeIn } from "../components/FadeIn";
import { riseIn } from "../components/motion";
import { CriteriaPanelSkeleton, SkeletonGroup, TabsSkeleton } from "../components/skeletons";
import { PROJECTS_PARENT } from "../components/PageHeader";
import { useTypedStoreActions, useTypedStoreState } from "../state/store";
import { ProjectTabs } from "../components/ProjectTabs";
import { NotFoundPage } from "./NotFound";
import { CriteriaPanel } from "../components/CriteriaPanel";
import { PaperCard } from "../components/PaperCard";
import { getPaperSortFunction, SortOption } from "../helpers/sort";
import { PaperList, PaperListSkeleton } from "../components/paperList/PaperList";
import { paginate } from "../components/paperList/pagination";
import { ScreeningTarget } from "../state/types";

const LIST_AND_CRITERIA = {
  display: "grid",
  gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 1fr) 320px" },
  alignItems: "start",
  gap: 3,
};

export const PapersPage = () => {
  const params = useParams<{ projectUuid: string; page?: string }>();
  const { projectUuid } = params;

  const currentPage = Number(params.page ?? 1);

  const [, setLocation] = useLocation();

  const loadingProjects = useTypedStoreState((state) => state.loading.projects);

  // TODO: Use computed value
  const loadingPapers = useTypedStoreState((state) =>
    state.loading.papers[projectUuid] === undefined ? true : state.loading.papers[projectUuid],
  );

  const getProjectByUuid = useTypedStoreState((state) => state.getProjectByUuid);
  const project = getProjectByUuid(projectUuid);

  const screeningTarget = project?.screening_target ?? ScreeningTarget.PAPER;
  const isGithubScreening = screeningTarget === ScreeningTarget.GITHUB_REPOSITORY;
  const itemNamePlural = isGithubScreening ? "repositories" : "papers";

  const getPapersForProject = useTypedStoreState((state) => state.getPapersForProject);
  const papers = getPapersForProject(projectUuid);

  const fetchPapers = useTypedStoreActions((actions) => actions.fetchPapers);

  const [hideAlreadyEvaluatedPapers, sethideAlreadyEvaluatedPapers] = useState(true);
  const [sortOption, setSortOption] = useState<SortOption>("ID_ASC");

  const sortedPapers = useMemo(
    () =>
      [...papers].sort(getPaperSortFunction(sortOption, (paper) => paper.avg_probability_decision)),
    [papers, sortOption],
  );
  const alreadyEvaluatedPapers = useMemo(
    () => [...papers].filter((p) => p.human_result !== null).length,
    [papers],
  );
  const sortedAndFilteredPapers = useMemo(
    () =>
      [...sortedPapers].filter((paper) => {
        if (!hideAlreadyEvaluatedPapers) {
          return true;
        }
        return paper.human_result === null;
      }),
    [hideAlreadyEvaluatedPapers, sortedPapers],
  );

  // TODO: Memoize & Redux
  const {
    pageItems: currentPapers,
    pageCount,
    page,
  } = paginate(sortedAndFilteredPapers, currentPage);

  useEffect(() => {
    if (project !== undefined) {
      fetchPapers(projectUuid);
    }
  }, [fetchPapers, project, projectUuid]);

  // Only the first load: a reload of the projects keeps the page as it is.
  if (loadingProjects && !project) {
    return (
      <Layout title="" parent={PROJECTS_PARENT} loading>
        <SkeletonGroup>
          <TabsSkeleton />
          <Box sx={LIST_AND_CRITERIA}>
            <PaperListSkeleton />
            <CriteriaPanelSkeleton />
          </Box>
        </SkeletonGroup>
      </Layout>
    );
  }
  if (project === undefined) {
    return <NotFoundPage />;
  }

  const shown = sortedAndFilteredPapers.length;

  return (
    <Layout title={project.name} parent={PROJECTS_PARENT}>
      <ProjectTabs projectUuid={projectUuid} active="papers" itemNamePlural={itemNamePlural} />
      <FadeIn sx={LIST_AND_CRITERIA}>
        <PaperList
          sx={riseIn(0)}
          sortOption={sortOption}
          onSortChange={setSortOption}
          loading={loadingPapers}
          emptyMessage={
            hideAlreadyEvaluatedPapers && papers.length > 0
              ? `All ${itemNamePlural} are evaluated. Turn off “Hide evaluated ${itemNamePlural}” to see them.`
              : `No ${itemNamePlural}.`
          }
          emptyTestId="no-papers-text"
          pagination={{
            page,
            pageCount,
            itemCount: shown,
            onPageChange: (page) => setLocation(`/project/${projectUuid}/papers/page/${page}`),
          }}
          toolbar={
            <>
              <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600 }}>
                {loadingPapers && papers.length === 0 ? (
                  <Skeleton width={110} />
                ) : shown === papers.length ? (
                  `${papers.length} ${itemNamePlural}`
                ) : (
                  `${shown} of ${papers.length} ${itemNamePlural}`
                )}
              </Typography>
              <FormControlLabel
                data-testid="label-filter_out_evaluated"
                labelPlacement="start"
                sx={{ ml: 0, gap: 0.5 }}
                control={
                  <Switch
                    checked={hideAlreadyEvaluatedPapers}
                    onChange={(e) => sethideAlreadyEvaluatedPapers(e.target.checked)}
                    slotProps={{
                      input: {
                        "data-testid": "input-filter_out_evaluated",
                      } as React.InputHTMLAttributes<HTMLInputElement>,
                    }}
                  />
                }
                label={
                  <Typography variant="body2">
                    Hide evaluated {itemNamePlural} ({alreadyEvaluatedPapers})
                  </Typography>
                }
              />
            </>
          }
        >
          {currentPapers.map((paper) => (
            <PaperCard
              key={paper.uuid}
              paper={paper}
              isGithubScreening={isGithubScreening}
              data-testid={`paper-${paper.paper_id}`}
            />
          ))}
        </PaperList>
        <CriteriaPanel
          inclusionCriteria={project.criteria.inclusion_criteria || []}
          exclusionCriteria={project.criteria.exclusion_criteria || []}
          inclusionTestId="inclusion-criteria"
          exclusionTestId="exclusion-criteria"
          sx={riseIn(1)}
        />
      </FadeIn>
    </Layout>
  );
};
