import { useCallback } from "react";
import { toast } from "react-toastify";
import { Layout } from "../components/Layout";
import { delete_project } from "../services/projectService";
import { Plus } from "lucide-react";
import { ProjectsList } from "../components/ProjectsList";
import { LinkButton } from "../components/LinkButton";
// import { useTypedStoreActions } from "../state/store";

const ProjectsPageActions = () => {
  return (
    <LinkButton variant="green" href="/create">
      <Plus />
      <span>New</span>
    </LinkButton>
  );
};

export const ProjectsPage = () => {
  // const setProjects = useTypedStoreActions((actions) => actions.setProjects);
  const handleProjectDelete = useCallback(async (uuid: string) => {
    try {
      await delete_project(uuid);
      // setProjects((prevProjects) => [
      //   ...prevProjects.filter((project) => project.uuid !== uuid),
      // ]);
      toast.success("Project deleted successfully", { autoClose: 1500 });
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  }, []);

  return (
    <Layout title="Projects" navbarActionComponent={ProjectsPageActions}>
      <ProjectsList handleProjectDelete={handleProjectDelete} />
    </Layout>
  );
};
