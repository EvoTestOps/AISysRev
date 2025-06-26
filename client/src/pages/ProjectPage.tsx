import { Layout } from "../components/Layout";
import { useParams } from "wouter";
import { useEffect, useState } from "react";
import { fetch_project_by_uuid } from "../services/projectService"
import { H1, H2, H3, H4, H5, H6 } from "../components/Typography";

export const Project = () => {
  const params = useParams<{ uuid: string }>();
  const uuid = params.uuid;
  const [project, setProject] = useState<{
    name: string;
    inclusion_criteria: string;
    exclusion_criteria: string;
  } | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const data = await fetch_project_by_uuid(uuid);
        setProject(data)
      } catch (error) {
        console.log("Failed to fetch Project", error)
      }
    };
    fetchProject()
  }, [uuid]);

  if (!project) return <div>Loading...</div>;

  return (
    <Layout title={project.name}>
      <div className="flex space-x-8 items-start">
        <div className="flex flex-col space-y-4">

          <div className="flex bg-neutral-50 p-4 rounded-2xl">
            <div className="flex w-full justify-between items-start">
              <p className="pr-16 font-semibold text-sm">List of papers</p>
              <div className="flex flex-col text-sm text-gray-700 max-w-sm">
                <p className="font-bold">
                  Inclusion criteria:
                </p>
                <p>
                  {project.inclusion_criteria}
                </p>
                <p className="mt-4 font-bold">
                  Exclusion criteria:
                </p>
                <p>
                  {project.exclusion_criteria}
                </p>
              </div>
            </div>
          </div>

          <H3>Screening tasks</H3>
          <div className="flex bg-neutral-50 py-12 rounded-2xl">
            {/* Screening content */}
          </div>

        </div>

        <div className="flex bg-neutral-50 p-24 rounded-2xl">
          <H5>LLM</H5>
        </div>
      </div>
    </Layout>
  );
};