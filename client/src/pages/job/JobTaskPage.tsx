import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Button from "@mui/material/Button";
import { Link, useParams } from "wouter";
import { AlertMessage } from "../../components/AlertMessage";
import { Card } from "../../components/Card";
import { Layout } from "../../components/Layout";
import { PaperDetails } from "../../components/paperList/PaperDetails";
import { H6 } from "../../components/Typography";
import { ScreeningTarget } from "../../state/types";
import { NotFoundPage } from "../NotFound";
import { useJobTaskDetail } from "./hooks/useJobTaskDetail";
import { useJobTasks } from "./hooks/useJobTasks";
import { useProjectJob } from "./hooks/useProjectJob";
import { JobBreadcrumbs } from "./JobBreadcrumbs";
import { jobDisplayName } from "../project/jobLabels";
import { JobSummaryCard } from "./JobSummaryCard";
import { PromptList } from "./PromptList";
import { TaskResultView } from "./result/TaskResultView";
import { isErroredTask, taskStatusLabel } from "./taskResult";

type StepButtonProps = {
  href: string | null;
  testId: string;
  direction: "previous" | "next";
};

/** Previous / next paper; disabled at either end of the list. */
const StepButton: React.FC<StepButtonProps> = ({ href, testId, direction }) => {
  const icon =
    direction === "previous"
      ? { startIcon: <ChevronLeftIcon /> }
      : { endIcon: <ChevronRightIcon /> };
  const label = direction === "previous" ? "Previous" : "Next";
  return href ? (
    <Button component={Link} href={href} size="small" data-testid={testId} {...icon}>
      {label}
    </Button>
  ) : (
    <Button size="small" disabled data-testid={testId} {...icon}>
      {label}
    </Button>
  );
};

/** One paper's result in a screening task: decision, criteria, error and prompts. */
export const JobTaskPage = () => {
  const { projectUuid, jobUuid, taskUuid } = useParams<{
    projectUuid: string;
    jobUuid: string;
    taskUuid: string;
  }>();
  const { loading, project, job, runNumber } = useProjectJob(projectUuid, jobUuid);
  const { task, loading: loadingTask, notFound, error } = useJobTaskDetail(jobUuid, taskUuid);
  // Same order as the job page, for previous / next.
  const { tasks } = useJobTasks(jobUuid);

  if (loading) {
    return null;
  }
  if (!project || !job || notFound) {
    return <NotFoundPage />;
  }

  const isGithubScreening = project.screening_target === ScreeningTarget.GITHUB_REPOSITORY;
  const itemName = isGithubScreening ? "repository" : "paper";
  const itemNamePlural = isGithubScreening ? "repositories" : "papers";
  const jobPath = `/project/${projectUuid}/job/${jobUuid}`;
  const index = tasks.findIndex((t) => t.uuid === taskUuid);
  const neighbour = (offset: number) => {
    const other = index === -1 ? undefined : tasks[index + offset];
    return other ? `${jobPath}/task/${other.uuid}` : null;
  };

  return (
    <Layout title={project.name}>
      <div className="flex flex-col gap-4" data-testid="job-task-page">
        <div className="flex items-center justify-between gap-4">
          <JobBreadcrumbs
            backHref={jobPath}
            backLabel={`Back to all ${itemNamePlural} in this task`}
            crumbs={[
              { label: "Screening tasks", href: `/project/${projectUuid}` },
              { label: jobDisplayName(job, runNumber), href: jobPath, testId: "task-back" },
              {
                label: task
                  ? `${task.paper_id != null ? `#${task.paper_id} ` : ""}${task.title}`
                  : "…",
              },
            ]}
          />
          <div className="flex items-center gap-2 shrink-0">
            <StepButton href={neighbour(-1)} testId="task-prev" direction="previous" />
            {index !== -1 && (
              <span className="text-xs text-slate-500">
                {index + 1} / {tasks.length}
              </span>
            )}
            <StepButton href={neighbour(1)} testId="task-next" direction="next" />
          </div>
        </div>
        <JobSummaryCard job={job} runNumber={runNumber} itemName={itemName} />
        {error && <AlertMessage className="p-4" message={error} />}
        {!loadingTask && task && (
          <>
            <Card>
              <H6>
                {task.paper_id != null && (
                  <span className="text-slate-500 mr-2">#{task.paper_id}</span>
                )}
                <span data-testid="task-title">{task.title}</span>
              </H6>
              <PaperDetails
                doi={task.doi}
                abstract={task.abstract}
                isGithubScreening={isGithubScreening}
              />
            </Card>
            <Card>
              <div className="flex items-center justify-between mb-2">
                <H6>Result</H6>
                <span className="text-xs text-slate-500" data-testid="task-status">
                  Status: {taskStatusLabel(task.status)}
                </span>
              </div>
              {isErroredTask(task) && task.error && (
                <div
                  className="text-sm text-red-700 bg-red-50 rounded-md p-2 mb-4 whitespace-pre-wrap"
                  data-testid="task-error"
                >
                  {task.error}
                </div>
              )}
              {task.result ? (
                <TaskResultView result={task.result} projectCriteria={project.criteria} />
              ) : (
                !isErroredTask(task) && <p className="text-sm text-slate-500">No result yet.</p>
              )}
            </Card>
            <Card>
              <H6>Prompt sent to the model</H6>
              <PromptList prompts={task.prompts} />
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
};
