import { useState } from "react";
import { Layout } from "../components/Layout";
import { fetch_projects, delete_project } from "../services/projectService";
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
  
  const handleProjectDelete = (uuid: string) => {
    delete_project(uuid)
      .then(() => {
        setProjects((prevProjects) => prevProjects.filter((project) => project.uuid !== uuid));
        console.log("Project deleted successfully");
      })
      .catch((error) => {
        console.error("Error deleting project:", error);
      });
  };

  const DisplayProjects = ({ projects }: { projects: Project[] }) => {
    if (projects.length === 0) {
      return (
        <div className="text-center text-gray-500 mt-8">
          No Projects
        </div>
      );
    };

    return projects.map((project) => (
      <div key={project.uuid} className="bg-white p-4 mb-4 rounded shadow-lg hover:brightness-125 transition-all duration-200">
        <div className="flex justify-between items-center">
          <H6>{project.name}</H6>
          <DropdownMenu
            items={[
              {
                label: 'Delete',
                onClick: () => {handleProjectDelete(project.uuid)},
              },
            ]}
          />
        </div>
      </div>
    ));
  };

  return (
      <Layout title="Projects">

        <DisplayProjects projects={projects} />
      </Layout>
  );
};