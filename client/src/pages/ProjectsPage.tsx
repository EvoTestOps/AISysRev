import { useCallback } from "react";
import { toast } from "react-toastify";
import { Layout } from "../components/Layout";
import { delete_project } from "../services/projectService";
import { Link } from "wouter";
import { Plus } from "lucide-react";
import { ProjectsList } from "../components/ProjectsList";
// import { useTypedStoreActions } from "../state/store";

const ProjectsPageActions = () => {
  return (
    <>
      <Link
        href="/create"
        className="flex flex-row items-center gap-2 p-2 bg-green-600 text-white text-xm font-bold rounded-sm shadow-sm hover:bg-green-500 transition duration-200 ease-in-out"
      >
        <Plus />
        <span>New</span>
      </Link>
    </>
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
