import { H6 } from "../components/Typography";
import { DropdownMenu } from "../components/DropDownMenu";
import { Project } from "../state/types";
import { Link } from "wouter";

type DisplayProjectsProps = {
  projects: Project[];
  handleProjectDelete: (uuid: string) => void;
};

export const DisplayProjects = ({ projects, handleProjectDelete }: DisplayProjectsProps) => {
  if (projects.length === 0) {
    return (
      <div className="text-center text-gray-500 mt-8">
        No Projects
      </div>
    );
  };

  return (
    <div>
      {projects.map((project) => (
        <div
          key={project.uuid}
          className="bg-white p-4 mb-4 rounded shadow-lg hover:brightness-125 transition-all duration-200"
        >
          <div className="flex justify-between items-center">
            <H6>
              <Link
                href={`/project/${project.uuid}`}
                className="inline-block hover:scale-105 transition duration-200"
              >
                {project.name}
              </Link>
            </H6>
            <DropdownMenu
              items={[
                {
                  label: "Delete",
                  onClick: () => handleProjectDelete(project.uuid),
                },
              ]}
            />
          </div>
        </div>
      ))}
    </div>
  );
};