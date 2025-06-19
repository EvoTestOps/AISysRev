import { Layout } from "../components/Layout";
import { FileDropArea } from '../components/FileDropArea'
import { H6 } from "../components/Typography";
import { useState } from "react";

export const NewProject = () => {
  const [title, setTitle] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [inclusionCriteria, setInclusionCriteria] = useState<string[]>([]);
  const [inclusionCriteriaInput, setInclusionCriteriaInput] = useState("");
  const [exclusionCriteria, setExclusionCriteria] = useState<string[]>([]);
  const [exclusionCriteriaInput, setExclusionCriteriaInput] = useState("");

  const handleInclusionChange = (index: number, value: string) => {
    const updated = [...inclusionCriteria];
    updated[index] = value;
    setInclusionCriteria(updated);
  };

  const handleExclusionChange = (index: number, value: string) => {
    const updated = [...exclusionCriteria];
    updated[index] = value;
    setExclusionCriteria(updated);
  };
  console.log(title, inclusionCriteria, exclusionCriteria);


  return (
    <Layout title="New Project">
      <div className="bg-white p-4 mb-4 rounded-2xl shadow-lg">
        <div className="flex flex-col gap-8">
        
          <div className="grid grid-cols-[200px_1fr] items-start gap-4">
            <H6>
              Title<span className="text-red-500 font-semibold">*</span>
            </H6>
            <input
              type="text"
              className="border border-gray-300 rounded-2xl py-2 px-4 w-full shadow-sm focus:outline-none"
              placeholder="Enter project title"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setTitle(titleInput);
                }
              }}
            />
          </div>

          <div className="grid grid-cols-[200px_1fr] items-start gap-4">
            <H6>
              List of papers<span className="text-red-500 font-semibold">*</span>
            </H6>
            <div className="w-full">
              <FileDropArea />
            </div>
          </div>

          <div className="grid grid-cols-[200px_1fr] items-start gap-4">
            <H6>Inclusion Criteria</H6>
            <div className="flex justify-between items-center gap-4">
              <input
                type="text"
                className="border border-gray-300 rounded-2xl py-2 px-4 w-full shadow-sm focus:outline-none"
                value={inclusionCriteriaInput}
                onChange={(e) => setInclusionCriteriaInput(e.target.value)}
                placeholder="Inclusion criterion"
              />
              <button
                className="bg-green-500 text-white h-8 w-16 rounded-full brightness-110 shadow-sm
                hover:bg-green-400 hover:drop-down-brightness-125 transition duration-200 ease-in-out"
                onClick={() => setInclusionCriteria([...inclusionCriteria, inclusionCriteriaInput])}
              >
                Add
              </button>
            </div>
          </div>

          <div className="grid grid-cols-[200px_1fr] items-center gap-4">
            <H6>Exclusion Criteria</H6>
            <div className="flex justify-between items-center gap-4">
              <input
                type="text"
                className="border border-gray-300 rounded-2xl py-2 px-4 w-full shadow-sm focus:outline-none"
                value={exclusionCriteriaInput}
                onChange={(e) => setExclusionCriteriaInput(e.target.value)}
                placeholder="Exclusion criterion"
              />
              <button
                className="bg-green-500 text-white h-8 w-16 rounded-full brightness-110 shadow-sm
                hover:bg-green-400 hover:drop-down-brightness-125 transition duration-200 ease-in-out"
                onClick={() => setExclusionCriteria([...exclusionCriteria, exclusionCriteriaInput])}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};