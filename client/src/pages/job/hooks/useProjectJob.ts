import { useEffect } from "react";
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

  return {
    loading: loadingProjects || jobs === undefined,
    project,
    job: jobs?.find((job) => job.uuid === jobUuid),
  };
};
