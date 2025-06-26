import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { Layout } from "../components/Layout";
import { DisplayProjects } from "../components/DisplayProjects";
import { fetch_projects, delete_project } from "../services/projectService";
import { Project } from "../state/types";

export const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);

  const loadProjects = useCallback(async () => {
    try {
      const projectsData = await fetch_projects();
      setProjects(projectsData);
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
      setProjects((prevProjects) =>
        [...prevProjects.filter((project) => project.uuid !== uuid)]
      );
      console.log("Project deleted successfully");
      toast.success("Project deleted successfully", {autoClose: 1500});
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  }, []);

  return (
      <Layout title="Projects">
        <DisplayProjects
          projects={projects}
          handleProjectDelete={handleProjectDelete}
        />
      </Layout>
  );
};