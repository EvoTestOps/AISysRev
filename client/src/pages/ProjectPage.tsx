import { Layout } from "../components/Layout";
import { useParams } from "wouter";
import { useCallback, useEffect, useState } from "react";
import { fetch_project_by_uuid } from "../services/projectService"
import { H1, H2, H3, H4, H5, H6 } from "../components/Typography";
import { CriteriaList } from "../components/CriteriaList";

export const Project = () => {
  const params = useParams<{ uuid: string }>();
  const uuid = params.uuid;
  const [name, setName] = useState<string>("");
  const [inclusionCriteria, setInclusionCriteria] = useState<string[]>([]);
  const [exclusionCriteria, setExclusionCriteria] = useState<string[]>([]);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const project = await fetch_project_by_uuid(uuid);
        console.log("Fetched project:", project);
        setName(project.name);
        setInclusionCriteria(
          project.inclusion_criteria
            .split(";")
            .map((criterion: string) => criterion.trim())
            .filter(Boolean)
        );
        setExclusionCriteria(
          project.exclusion_criteria
            .split(";")
            .map((criterion: string) => criterion.trim())
            .filter(Boolean)
        );
      } catch (error) {
        console.log("Failed to fetch Project", error)
      }
    };
    fetchProject()
  }, [uuid]);

  const deleteInclusionCriteria = useCallback((index: number) => {
    setInclusionCriteria((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const deleteExclusionCriteria = useCallback((index: number) => {
    setExclusionCriteria((prev) => prev.filter((_, i) => i !== index));
  }, []);

  if (!name) return <div>Loading...</div>;

  return (
    <Layout title={name} className="">
      <div className="flex space-x-8 items-start">
        <div className="flex flex-col space-y-4 w-7xl">


          <div className="grid grid-cols-3 gap-4 p-4 w-full bg-neutral-50 rounded-2xl">
            <p className="col-span-1 font-semibold text-sm">List of papers</p>
            <div className="col-span-2 flex flex-col text-sm text-gray-700 max-w-sm">
              <p className="font-bold pb-2">Inclusion criteria:</p>
              <CriteriaList
                criteria={inclusionCriteria}
                onDelete={deleteInclusionCriteria}
              />
              <p className="font-bold pb-2 mt-4">
                Exclusion criteria:
              </p>
              <CriteriaList
                criteria={exclusionCriteria}
                onDelete={deleteExclusionCriteria}
              />
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