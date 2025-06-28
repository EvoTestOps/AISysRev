import { useParams } from "wouter";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Layout } from "../components/Layout";
import { fetch_project_by_uuid } from "../services/projectService"
import { H3, H5 } from "../components/Typography";
import { CriteriaList } from "../components/CriteriaList";
import { Project } from "../state/types";
import { DropdownMenuText } from "../components/DropDownMenus";

type ScreeningTask = {
  llm: string;
  temperature: number;
  seed: number;
  top_p: number;
};

export const ProjectPage = () => {
  const params = useParams<{ uuid: string }>();
  const uuid = params.uuid;
  const [name, setName] = useState<string>('');
  const [inclusionCriteria, setInclusionCriteria] = useState<string[]>([]);
  const [exclusionCriteria, setExclusionCriteria] = useState<string[]>([]);
  const [selectedLlm, setSelectedLlm] = useState<string>('');
  const [temperature, setTemperature] = useState<number>(0.5);
  const [seed, setSeed] = useState<number>(128);
  const [top_p, setTop_p] = useState<number>(0.5);
  const [screeningTasks, setScreeningTasks] = useState<ScreeningTask[]>([])

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const project: Project = await fetch_project_by_uuid(uuid);
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

  const createTask = () => {
    if (!selectedLlm) {
      toast.error("Please select a llm model before creating a task.");
      return;
    }
    const newScreeningTask: ScreeningTask = {
      llm: selectedLlm,
      temperature: temperature,
      seed: seed,
      top_p: top_p
    }
    setScreeningTasks((prev) => ([...prev, newScreeningTask]))
  }

  if (!name) return <div>Error</div>;

  return (
    <Layout title={name} className="w-5xl">
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
          {screeningTasks.map(task => (
            <div className="flex justify-between bg-neutral-50 py-4 rounded-2xl">
              <p className="flex pl-4 items-center">Task #1</p>
              <div className="flex">
                <div className="relative w-48 h-8 px-4">
                  <progress
                    value={50}
                    max={100}
                    className="h-full w-full
                      [&::-webkit-progress-bar]:rounded-xl
                      [&::-webkit-progress-bar]:bg-gray-400
                      [&::-webkit-progress-value]:bg-blue-200
                      [&::-webkit-progress-value]:rounded-xl
"
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
                    647/4678
                  </div>
                </div>
                <div className="flex px-8 text-md text-red-500 items-center cursor-pointer">
                  Cancel
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col bg-neutral-50 p-4 rounded-2xl">
          <div className="flex pb-4">
            <H5 className="pr-16">LLM</H5>
            <DropdownMenuText
              options={[
                "gpt-3.5-turbo",
                "gpt-4o-mini",
                "chatgpt-4o",
                "claude-3.5-sonnet",
                "mistral",
              ]}
              selected={selectedLlm}
              onSelect={setSelectedLlm}
            />
          </div>

          <p className="text-md font-bold pt-4 pb-4">LLM configuration</p>

          <div className="flex pt-4 pb-4 justify-between">
            <p className="text-md font-semibold">Temperature ({temperature})</p>
            <input
              type="range"
              className="pl-2 cursor-pointer bg-gray-200"
              data-testid="temperature-input"
              min={0}
              max={1}
              step={0.1}
              value={temperature}
              onChange={(e) => {
                e.preventDefault();
                setTemperature(e.target.valueAsNumber);
              }}
            />
          </div>

          <div className="flex pt-4 pb-4 justify-between items-center">
            <p className="text-md font-semibold">Seed</p>
            <input
              type="number"
              className="p-1 rounded-xl text-center border-gray-300 border-2 hover:bg-gray-100 cursor-pointer"
              data-testid="seed-input"
              value={seed}
              onChange={(e) => {
                e.preventDefault();
                setSeed(e.target.valueAsNumber);
              }}
            />
          </div>

          <div className="flex pt-4 pb-4 justify-between items-center">
            <p className="text-md font-semibold">top_p ({top_p})</p>
            <input
              type="range"
              className="pl-2 cursor-pointer bg-gray-200"
              data-testid="temperature-input"
              min={0}
              max={1}
              step={0.1}
              value={top_p}
              onChange={(e) => {
                e.preventDefault();
                setTop_p(e.target.valueAsNumber);
              }}
            />
          </div>

          <div className="flex justify-end p-4 pb-2">
            <button
              onClick={createTask}
              title="New Task"
              className="bg-green-600 text-white w-fit py-2 px-4 text-md rounded-2xl
                hover:bg-green-500 transition duration-200 ease-in-out cursor-pointer"
            >
              New Task
            </button>
          </div>

        </div>
      </div>
    </Layout>
  );
};