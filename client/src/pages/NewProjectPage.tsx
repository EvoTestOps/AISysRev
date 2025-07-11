import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { toast } from 'react-toastify';
import { H6 } from "../components/Typography";
import { Layout } from "../components/Layout";
import { CreateProject } from "../components/CreateProject";
import { CriteriaInput } from "../components/CriteriaInput";
import { CriteriaList } from "../components/CriteriaList";
import { ExpandableToast } from "../components/ExpandableToast";

export const NewProject = () => {
  const [title, setTitle] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [inclusionCriteriaInput, setInclusionCriteriaInput] = useState('');
  const [exclusionCriteriaInput, setExclusionCriteriaInput] = useState('');
  const [inclusionCriteria, setInclusionCriteria] = useState<string[]>([]);
  const [exclusionCriteria, setExclusionCriteria] = useState<string[]>([]);

  const [, navigate] = useLocation();

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleInclusionSetup = useCallback(() => {
    setInclusionCriteria([...inclusionCriteria, inclusionCriteriaInput]);
    setInclusionCriteriaInput("");
  }, [inclusionCriteria, inclusionCriteriaInput]);

  const handleExclusionSetup = useCallback(() => {
    setExclusionCriteria([...exclusionCriteria, exclusionCriteriaInput]);
    setExclusionCriteriaInput("");
  }, [exclusionCriteria, exclusionCriteriaInput]);

  const deleteInclusionCriteria = useCallback((index: number) => {
    setInclusionCriteria((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const deleteExclusionCriteria = useCallback((index: number) => {
    setExclusionCriteria((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleCreate = useCallback(async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    let uuid: string | null = null;

    try {
      const res = await CreateProject({
        title,
        inclusionCriteria,
        exclusionCriteria,
      });

      uuid = res.uuid;
      toast.success('Project created successfully!');

      if (uuid) {
        navigate(`/project/${uuid}`);
      };

    } catch (error: any) {
      try {
        const msg = typeof error?.message === "string" ? error.message : "";
        const parsed = JSON.parse(msg);

        if (Array.isArray(parsed)) {
          ExpandableToast(parsed);
        } else {
          toast.error("Project creation failed (non-array error).");
        };
      } catch (parseError) {
        console.error("JSON parsing failed:", parseError);
        toast.error(`Project creation failed: ${error.message || "Unknown error"}`);
      };

      return;
    };

  }, [title, inclusionCriteria, exclusionCriteria, navigate]);

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
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-[200px_1fr] items-start gap-4">
            <div></div>

            <div className="flex flex-col gap-1 pl-4">
              {!selectedFiles && (
                <p className="text-gray-400 italic">No files selected yet</p>
              )}
              <ol className="list-decimal text-gray-700 space-y-4 pl-4">
                {selectedFiles.map((file, idx) => (
                  <li key={idx}>
                    <div className="flex justify-between items-center pr-2">
                      <span>{file.name}</span>
                      <button
                        className="text-red-500 text-sm hover:underline"
                        onClick={() => removeFile(idx)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <CriteriaInput
            label="Inclusion criteria"
            placeholder="Inclusion criterion"
            value={inclusionCriteriaInput}
            setCriteriaInput={setInclusionCriteriaInput}
            handleSetup={handleInclusionSetup}
          />

          <div className="grid grid-cols-[200px_1fr] items-start gap-4">
            <div></div>
            <CriteriaList
              criteria={inclusionCriteria}
              onDelete={deleteInclusionCriteria}
            />
          </div>

          <CriteriaInput
            label="Exclusion criteria"
            placeholder="Exclusion criterion"
            value={exclusionCriteriaInput}
            setCriteriaInput={setExclusionCriteriaInput}
            handleSetup={handleExclusionSetup}
          />
          <div className="grid grid-cols-[200px_1fr] items-start gap-4">
            <div></div>
            <CriteriaList
              criteria={exclusionCriteria}
              onDelete={deleteExclusionCriteria}
            />
          </div>

          <div className="flex justify-end items-end gap-4">
            <button
              className="bg-red-600 text-white font-bold h-12 w-24 rounded-full brightness-110 shadow-md hover:bg-red-500 hover:drop-down-brightness-125 transition duration-200 ease-in-out"
              onClick={() => {
                setTitle("");
                setInclusionCriteria([]);
                setExclusionCriteria([]);
                setInclusionCriteriaInput("");
                setExclusionCriteriaInput("");
                setSelectedFiles([]);
              }}
            >
              Cancel
            </button>
            <button
              className="bg-blue-600 text-white font-bold h-12 w-24 rounded-full brightness-110 shadow-md hover:bg-blue-500 hover:drop-down-brightness-125 transition duration-200 ease-in-out"
              onClick={handleCreate}
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};