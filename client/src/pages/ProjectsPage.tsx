import { useCallback } from "react";
import { toast } from "react-toastify";
import { Layout } from "../components/Layout";
import { delete_project } from "../services/projectService";
import { Plus } from "lucide-react";
import { ProjectsList } from "../components/ProjectsList";
import { LinkButton } from "../components/LinkButton";
import { useTypedStoreActions } from "../state/store";

const ProjectsPageActions = () => {
  return (
    <LinkButton variant="green" href="/create">
      <Plus />
      <span>New</span>
    </LinkButton>
  );
};

export const ProjectsPage = () => {
  const fetchProjects = useTypedStoreActions(
    (actions) => actions.fetchProjects
  );
  const handleProjectDelete = useCallback(
    async (uuid: string) => {
      try {
        await delete_project(uuid);
        fetchProjects();
        toast.success("Project deleted successfully", { autoClose: 1500 });
      } catch (error) {
        console.error("Error deleting project:", error);
      }
    },
    [fetchProjects]
  );

  return (
    <Layout title="Projects" navbarActionComponent={ProjectsPageActions}>
      <ProjectsList handleProjectDelete={handleProjectDelete} />
    </Layout>
  );
};
