import { useEffect } from "react";
import { useTypedStoreActions, useTypedStoreState } from "../state/store";
import { NavTabs } from "./NavTabs";

type ProjectTabsProps = {
  projectUuid: string;
  active: "tasks" | "papers";
  itemNamePlural: string;
};

/** A project's "Screening tasks" and "List of papers" tabs, with the paper count. */
export const ProjectTabs: React.FC<ProjectTabsProps> = ({
  projectUuid,
  active,
  itemNamePlural,
}) => {
  const paperCount = useTypedStoreState((state) => state.getPapersForProject(projectUuid).length);
  // undefined: never requested; true: loading; false: loaded.
  const papersLoading = useTypedStoreState((state) => state.loading.papers[projectUuid]);
  const fetchPapers = useTypedStoreActions((actions) => actions.fetchPapers);

  // Pages that don't list papers themselves (e.g. a job's page) still show the count.
  useEffect(() => {
    if (papersLoading === undefined) {
      fetchPapers(projectUuid);
    }
  }, [papersLoading, fetchPapers, projectUuid]);

  const tasksHref = `/project/${projectUuid}`;
  const papersHref = `/project/${projectUuid}/papers/page/1`;
  return (
    <NavTabs
      aria-label="Project sections"
      active={active === "tasks" ? tasksHref : papersHref}
      tabs={[
        { label: "Screening tasks", href: tasksHref },
        {
          label: `List of ${itemNamePlural}`,
          href: papersHref,
          count: papersLoading === false ? paperCount : undefined,
        },
      ]}
    />
  );
};
