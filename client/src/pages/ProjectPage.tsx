import { Layout } from "../components/Layout";
import { useParams } from "wouter";
import { useEffect, useState } from "react";
import { fetch_project_by_uuid } from "../services/projectService"

export const Project = () => {
  const params = useParams<{ uuid: string }>();
  const uuid = params.uuid;
  const [project, setProject] = useState<{
    name:string;
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
      <p><strong>Inclusion criteria:</strong> {project.inclusion_criteria}</p>
      <p><strong>Exclusion criteria:</strong> {project.exclusion_criteria}</p>

    </Layout>
  );
};