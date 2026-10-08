import { useEffect, useMemo } from "react";
import { jobRunNumbers } from "../../project/jobLabels";
import { useTypedStoreActions, useTypedStoreState } from "../../../state/store";

/** The project and one of its jobs (with stats), loading the jobs if needed. */
export const useProjectJob = (projectUuid: string, jobUuid: string) => {
  const loadingProjects = useTypedStoreState((state) => state.loading.projects);
  const project = useTypedStoreState((state) => state.getProjectByUuid)(projectUuid);
  const jobs = useTypedStoreState((state) => state.jobsByProject[projectUuid]);
  const fetchJobsForProject = useTypedStoreActions((actions) => actions.fetchJobsForProject);

  useEffect(() => {
    if (projectUuid) {
      fetchJobsForProject(projectUuid);
    }
  }, [projectUuid, fetchJobsForProject]);

  const runNumber = useMemo(
    () => (jobs ? jobRunNumbers(jobs)[jobUuid] : undefined),
    [jobs, jobUuid],
  );

  return {
    // Only the first load: a reload of the projects keeps what is shown.
    loading: (loadingProjects && !project) || jobs === undefined,
    project,
    job: jobs?.find((job) => job.uuid === jobUuid),
    /** Which run of its model in the project, e.g. 2 for Run #2. */
    runNumber,
  };
};
