import { useState } from "react";
import { Layout } from "../components/Layout";
import { fetch_projects } from "../services/projectService";
import { Project } from "../state/types";
import { H6 } from "../components/Typography";


import { useEffect } from "react";

export const Projects = () => {
  const [projects, setProjects] = useState([]);

  const loadProjects = async () => {
    try {
      const projectsData = await fetch_projects();
      setProjects(projectsData);
      console.log("Projects loaded successfully");
    } catch (error) {
      console.error("Error loading projects:", error);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const DisplayProjects = ({ projects }: { projects: Project[] }) => {
    return projects.map((project) => (
      <div key={project.uuid} className="bg-zinc-50 p-4 mb-4 rounded shadow-lg">
        <H6>{project.name}</H6>
        <p>{project.description}</p>
      </div>
    ));
  }

  return (
      <Layout title="Projects">

        <DisplayProjects projects={projects} />
      </Layout>
  );
};