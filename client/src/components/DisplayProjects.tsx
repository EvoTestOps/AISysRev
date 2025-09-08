import { H6 } from "../components/Typography";
import { DropdownMenuEllipsis } from "./DropDownMenus";
import { Project } from "../state/types";
import { Link } from "wouter";
import Skeleton from "react-loading-skeleton";
import { Trash2 } from "lucide-react";

type DisplayProjectsProps = {
  projects: Project[];
  loadingProjects: boolean;
  handleProjectDelete: (uuid: string) => void;
};

export const DisplayProjects: React.FC<DisplayProjectsProps> = ({
  projects,
  handleProjectDelete,
  loadingProjects,
}) => {
  const skeletons = [1, 2, 3, 4, 5];

  return (
    <div>
      {!loadingProjects && !projects.length && (
        <div className="text-center text-gray-600 mt-8">No projects.</div>
      )}
      {loadingProjects &&
        skeletons.map((skeleton) => (
          <div
            key={skeleton}
            className="bg-white p-4 mb-4 rounded h-20 flex items-center"
          >
            <div className="w-full">
              <Skeleton />
            </div>
          </div>
        ))}
      {!loadingProjects &&
        projects &&
        projects.length > 0 &&
        projects.map((project) => (
          <div
            key={project.uuid}
            className="bg-white p-4 mb-4 rounded h-20 flex justify-between items-center"
          >
            <H6>
              <Link
                href={`/project/${project.uuid}`}
                className="inline-block hover:text-blue-900 transition duration-200"
              >
                {project.name}
              </Link>
            </H6>
            <DropdownMenuEllipsis
              items={[
                {
                  label: () => (
                    <div className="text-red-700 flex flex-row gap-3 items-center">
                      <Trash2 />
                      <span>Delete</span>
                    </div>
                  ),
                  onClick: () => handleProjectDelete(project.uuid),
                },
              ]}
            />
          </div>
        ))}
    </div>
  );
};
