import { useMemo, useState } from "react";
import { useParams } from "wouter";
import { AlertMessage } from "../../components/AlertMessage";
import { Card } from "../../components/Card";
import { CriteriaList } from "../../components/CriteriaList";
import { Layout } from "../../components/Layout";
import { PaginationBar } from "../../components/paperList/PaginationBar";
import { paginate } from "../../components/paperList/pagination";
import { PaperListHeader } from "../../components/paperList/PaperListHeader";
import { ProjectTabs } from "../../components/ProjectTabs";
import { H6 } from "../../components/Typography";
import { getPaperSortFunction, SortOption } from "../../helpers/sort";
import { JobTaskRead } from "../../services/api/client";
import { ScreeningTarget } from "../../state/types";
import { NotFoundPage } from "../NotFound";
import { SegmentedButton } from "../project/createTask/controls";
import { useJobTasks } from "./hooks/useJobTasks";
import { useProjectJob } from "./hooks/useProjectJob";
import { JobBreadcrumbs } from "./JobBreadcrumbs";
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

// Tasks list like papers: by paper id, title and this task's probability.
const sortableTask = (task: JobTaskRead) => ({ ...task, paper_id: task.paper_id ?? 0 });

/** The papers a screening task (job) screened, with the task's result for each. */
export const JobPage = () => {
  const { projectUuid, jobUuid } = useParams<{ projectUuid: string; jobUuid: string }>();
  const { loading, project, job } = useProjectJob(projectUuid, jobUuid);
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

  if (loading) {
    return null;
  }
  if (!project || !job) {
    return <NotFoundPage />;
  }

  const isGithubScreening = project.screening_target === ScreeningTarget.GITHUB_REPOSITORY;
  const itemName = isGithubScreening ? "repository" : "paper";
  const itemNamePlural = isGithubScreening ? "repositories" : "papers";
  const jobPath = `/project/${projectUuid}/job/${jobUuid}`;

  return (
    <Layout title={project.name}>
      <ProjectTabs projectUuid={projectUuid} active="tasks" itemNamePlural={itemNamePlural} />
      <div className="flex flex-col gap-4" data-testid="job-page">
        <JobBreadcrumbs
          backHref={`/project/${projectUuid}`}
          backLabel="Back to screening tasks"
          crumbs={[
            { label: "Screening tasks", href: `/project/${projectUuid}` },
            { label: job.llm_config.model_name },
          ]}
        />
        <JobSummaryCard job={job} itemName={itemName} />
        <div className="grid grid-cols-4 gap-2 max-w-xl">
          {FILTERS.map(({ value, label }) => (
            <SegmentedButton
              key={value}
              testId={`job-task-filter-${value.toLowerCase()}`}
              selected={filter === value}
              onSelect={() => {
                setFilter(value);
                setPage(1);
              }}
            >
              {label}
            </SegmentedButton>
          ))}
        </div>
        <div className="grid grid-cols-[1fr_350px] gap-2">
          <div className="flex flex-col gap-2">
            <PaperListHeader
              sortOption={sortOption}
              onSortChange={setSortOption}
              probabilityLabel="Probability of inclusion (this task)"
            />
            {error && <AlertMessage className="p-4" message={error} />}
            <div className="flex flex-col gap-1">
              {!loadingTasks &&
                pageItems.map((task) => (
                  <JobTaskRow
                    key={task.uuid}
                    task={task}
                    taskHref={`${jobPath}/task/${task.uuid}`}
                    isGithubScreening={isGithubScreening}
                  />
                ))}
            </div>
            {!loadingTasks && !error && visibleTasks.length === 0 && (
              <AlertMessage
                className="p-4"
                data-testid="no-job-tasks-text"
                message={`No ${itemNamePlural}.`}
              />
            )}
            {!loadingTasks && (
              <PaginationBar
                currentPage={currentPage}
                pageCount={pageCount}
                onPageChange={setPage}
              />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="sticky top-2 h-16 flex items-center content-center p-4 bg-slate-800 text-white rounded-lg">
              <H6>Inclusion and exclusion criteria</H6>
            </div>
            <Card className="sticky top-20">
              <H6>Inclusion criteria</H6>
              <CriteriaList criteria={project.criteria.inclusion_criteria || []} />
              <H6>Exclusion criteria</H6>
              <CriteriaList criteria={project.criteria.exclusion_criteria || []} />
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};
