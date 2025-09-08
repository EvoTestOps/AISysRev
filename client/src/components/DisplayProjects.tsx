import { H6 } from "../components/Typography";
import { DropdownMenuEllipsis } from "./DropDownMenus";
import { Project } from "../state/types";
import { Link } from "wouter";
import Skeleton from "react-loading-skeleton";

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
  if (!loadingProjects && !projects.length) {
    return <div className="text-center text-gray-500 mt-8">No Projects</div>;
  }

  return (
    <div>
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
        projects.map((project) => (
          <div
            key={project.uuid}
            className="bg-white p-4 mb-4 rounded hover:brightness-125 transition-all duration-200 h-20 flex justify-between items-center"
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
                  label: "Delete",
                  onClick: () => handleProjectDelete(project.uuid),
                },
              ]}
            />
          </div>
        ))}
    </div>
  );
};
