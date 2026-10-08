import { useMemo, useState } from "react";
import { useParams } from "wouter";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { CriteriaPanel } from "../../components/CriteriaPanel";
import { Layout } from "../../components/Layout";
import { FadeIn } from "../../components/FadeIn";
import { riseIn } from "../../components/motion";
import {
  BreadcrumbsSkeleton,
  CriteriaPanelSkeleton,
  JobCardSkeleton,
  SkeletonGroup,
  TabsSkeleton,
} from "../../components/skeletons";
import { PROJECTS_PARENT } from "../../components/PageHeader";
import { paginate } from "../../components/paperList/pagination";
import { PaperList, PaperListSkeleton } from "../../components/paperList/PaperList";
import { ProjectTabs } from "../../components/ProjectTabs";
import { getPaperSortFunction, SortOption } from "../../helpers/sort";
import { JobTaskRead } from "../../services/api/client";
import { ScreeningTarget } from "../../state/types";
import { NotFoundPage } from "../NotFound";
import { useJobTasks } from "./hooks/useJobTasks";
import { useProjectJob } from "./hooks/useProjectJob";
import { JobBreadcrumbs } from "./JobBreadcrumbs";
import { jobDisplayName } from "../project/jobLabels";
import { JobSummaryCard } from "./JobSummaryCard";
import { JobTaskRow } from "./JobTaskRow";
import { isErroredTask, overallDecision } from "./taskResult";

type TaskFilter = "ALL" | "INCLUDED" | "EXCLUDED" | "ERRORS";

const FILTERS: { value: TaskFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "INCLUDED", label: "Included" },
  { value: "EXCLUDED", label: "Excluded" },
  { value: "ERRORS", label: "Errors" },
];

const matchesFilter = (task: JobTaskRead, filter: TaskFilter) => {
  switch (filter) {
    case "ALL":
      return true;
    case "INCLUDED":
      return overallDecision(task.result)?.include === true;
    case "EXCLUDED":
      return overallDecision(task.result)?.include === false;
    case "ERRORS":
      return isErroredTask(task);
  }
};

const LIST_AND_CRITERIA = {
  display: "grid",
  gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 1fr) 320px" },
  alignItems: "start",
  gap: 3,
};

// Tasks list like papers: by paper id, title and this task's probability.
const sortableTask = (task: JobTaskRead) => ({ ...task, paper_id: task.paper_id ?? 0 });

/** The papers a screening task (job) screened, with the task's result for each. */
export const JobPage = () => {
  const { projectUuid, jobUuid } = useParams<{ projectUuid: string; jobUuid: string }>();
  const { loading, project, job, runNumber } = useProjectJob(projectUuid, jobUuid);
  const { tasks, loading: loadingTasks, error } = useJobTasks(jobUuid);

  const [filter, setFilter] = useState<TaskFilter>("ALL");
  const [sortOption, setSortOption] = useState<SortOption>("ID_ASC");
  const [page, setPage] = useState(1);

  const visibleTasks = useMemo(
    () =>
      tasks
        .filter((task) => matchesFilter(task, filter))
        .map(sortableTask)
        .sort(
          getPaperSortFunction(sortOption, (task) => overallDecision(task.result)?.probability),
        ),
    [tasks, filter, sortOption],
  );
  const { pageItems, pageCount, page: currentPage } = paginate(visibleTasks, page);

  const isGithubScreening = project?.screening_target === ScreeningTarget.GITHUB_REPOSITORY;
  const itemName = isGithubScreening ? "repository" : "paper";
  const itemNamePlural = isGithubScreening ? "repositories" : "papers";

  if (loading) {
    return (
      <Layout title={project?.name ?? ""} parent={PROJECTS_PARENT} loading={!project}>
        {project ? (
          <ProjectTabs projectUuid={projectUuid} active="tasks" itemNamePlural={itemNamePlural} />
        ) : (
          <TabsSkeleton />
        )}
        <SkeletonGroup sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <BreadcrumbsSkeleton />
          <JobCardSkeleton />
          <Box sx={LIST_AND_CRITERIA}>
            <PaperListSkeleton />
            <CriteriaPanelSkeleton />
          </Box>
        </SkeletonGroup>
      </Layout>
    );
  }
  if (!project || !job) {
    return <NotFoundPage />;
  }

  const jobPath = `/project/${projectUuid}/job/${jobUuid}`;

  return (
    <Layout title={project.name} parent={PROJECTS_PARENT}>
      <ProjectTabs projectUuid={projectUuid} active="tasks" itemNamePlural={itemNamePlural} />
      <FadeIn className="flex flex-col gap-4" data-testid="job-page">
        <Box sx={riseIn(0)}>
          <JobBreadcrumbs
            backHref={`/project/${projectUuid}`}
            backLabel="Back to screening tasks"
            crumbs={[
              { label: "Screening tasks", href: `/project/${projectUuid}` },
              { label: jobDisplayName(job, runNumber) },
            ]}
          />
        </Box>
        <Box sx={riseIn(1)}>
          <JobSummaryCard job={job} runNumber={runNumber} itemName={itemName} />
        </Box>
        <Box sx={LIST_AND_CRITERIA}>
          <PaperList
            sx={riseIn(2)}
            sortOption={sortOption}
            onSortChange={setSortOption}
            probabilityLabel="Probability of inclusion (this task)"
            loading={loadingTasks}
            error={error}
            emptyMessage={`No ${itemNamePlural}.`}
            emptyTestId="no-job-tasks-text"
            pagination={{
              page: currentPage,
              pageCount,
              itemCount: visibleTasks.length,
              onPageChange: setPage,
            }}
            toolbar={
              <>
                <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600 }}>
                  {loadingTasks && tasks.length === 0 ? (
                    <Skeleton width={110} />
                  ) : visibleTasks.length === tasks.length ? (
                    `${tasks.length} ${itemNamePlural}`
                  ) : (
                    `${visibleTasks.length} of ${tasks.length} ${itemNamePlural}`
                  )}
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  color="primary"
                  aria-label={`Show ${itemNamePlural}`}
                  value={filter}
                  onChange={(_, value: TaskFilter | null) => {
                    // Clicking the current filter again keeps it.
                    if (value !== null) {
                      setFilter(value);
                      setPage(1);
                    }
                  }}
                >
                  {FILTERS.map(({ value, label }) => (
                    <ToggleButton
                      key={value}
                      value={value}
                      data-testid={`job-task-filter-${value.toLowerCase()}`}
                      sx={{ px: 1.5, textTransform: "none" }}
                    >
                      {label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </>
            }
          >
            {pageItems.map((task) => (
              <JobTaskRow
                key={task.uuid}
                task={task}
                taskHref={`${jobPath}/task/${task.uuid}`}
                isGithubScreening={isGithubScreening}
              />
            ))}
          </PaperList>
          <CriteriaPanel
            inclusionCriteria={project.criteria.inclusion_criteria || []}
            exclusionCriteria={project.criteria.exclusion_criteria || []}
            sx={riseIn(3)}
          />
        </Box>
      </FadeIn>
    </Layout>
  );
};
