import { H6 } from "../components/Typography";
import { DropdownMenuEllipsis } from "./DropDownMenus";
import { Link } from "wouter";
import Skeleton from "react-loading-skeleton";
import { Trash2 } from "lucide-react";
import { Card } from "./Card";
import { useTypedStoreState } from "../state/store";

type ProjectsListProps = {
  handleProjectDelete: (uuid: string) => void;
};

export const ProjectsList: React.FC<ProjectsListProps> = ({
  handleProjectDelete,
}) => {
  const loadingProjects = useTypedStoreState((state) => state.loadingProjects);
  const projects = useTypedStoreState((state) => state.projects);
  const skeletons = [1, 2, 3, 4, 5];

  return (
    <>
      {!loadingProjects && !projects.length && (
        <div className="text-center text-gray-600 mt-8">No projects.</div>
      )}
      {loadingProjects && (
        <div className="flex flex-col gap-2">
          {skeletons.map((skeleton) => (
            <Card key={skeleton} className="h-20">
              <div className="w-full h-full">
                <Skeleton />
              </div>
            </Card>
          ))}
        </div>
      )}
      {!loadingProjects && projects && projects.length > 0 && (
        <div className="flex flex-col gap-2">
          {projects.map((project) => (
            <Card key={project.uuid}>
              <div className="p-2 rounded-lg flex justify-between items-center">
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
            </Card>
          ))}
        </div>
      )}
    </>
  );
};
