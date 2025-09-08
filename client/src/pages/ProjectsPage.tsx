import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { Layout } from "../components/Layout";
import { DisplayProjects } from "../components/DisplayProjects";
import { fetch_projects, delete_project } from "../services/projectService";
import { Project } from "../state/types";
import { Link } from "wouter";
import { Plus } from "lucide-react";

const ProjectsPageActions = () => {
  return (
    <>
      <Link href="/create" className="pr-2">
        <Plus
          className="bg-green-600 text-white 
              h-8 w-8
              rounded-sm
              brightness-110
              shadow-sm
              hover:bg-green-500
              hover:drop-down-brightness-125
              transition duration-200 ease-in-out
            "
        />
      </Link>
    </>
  );
};

export const ProjectsPage = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const loadProjects = useCallback(async () => {
    try {
      setLoadingProjects(true);
      await new Promise((resolve) => setTimeout(resolve, 500));
      const projectsData: Project[] = await fetch_projects();
      setProjects(projectsData);
      setLoadingProjects(false);
      console.log("Projects loaded successfully");
    } catch (error) {
      console.error("Error loading projects:", error);
    }
  }, []);

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProjectDelete = useCallback(async (uuid: string) => {
    try {
      await delete_project(uuid);
      setProjects((prevProjects) => [
        ...prevProjects.filter((project) => project.uuid !== uuid),
      ]);
      toast.success("Project deleted successfully", { autoClose: 1500 });
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  }, []);

  return (
    <Layout title="Projects" navbarActionComponent={ProjectsPageActions}>
      <DisplayProjects
        loadingProjects={loadingProjects}
        projects={projects}
        handleProjectDelete={handleProjectDelete}
      />
    </Layout>
  );
};
