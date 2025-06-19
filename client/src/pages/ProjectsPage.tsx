import { useState } from "react";
import { Layout } from "../components/Layout";
import { fetch_projects } from "../services/projectService";
import { Project } from "../state/types";
import { H6 } from "../components/Typography";
import { DropdownMenu } from "../components/DropDownMenu";


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
      <div key={project.uuid} className="bg-white p-4 mb-4 rounded shadow-lg hover:brightness-125 transition-all duration-200">
        <div className="flex justify-between items-center">
          <H6>{project.name}</H6>
          <DropdownMenu
            items={[
              {
                label: 'Delete',
                onClick: () => console.log('Delete clicked'),
              },
            ]}
          />
        </div>
      </div>
    ));
  }

  return (
      <Layout title="Projects">

        <DisplayProjects projects={projects} />
      </Layout>
  );
};