import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { H6 } from "../components/Typography";
import { Layout } from "../components/Layout";
import { FileDropArea } from '../components/FileDropArea'
import { CreateProject } from "../components/CreateProject";
import { showCriteriaList } from "../components/CriteriaList";

export const NewProject = () => {
  const [title, setTitle] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [inclusionCriteria, setInclusionCriteria] = useState<string[]>([]);
  const [inclusionCriteriaInput, setInclusionCriteriaInput] = useState("");
  const [exclusionCriteria, setExclusionCriteria] = useState<string[]>([]);
  const [exclusionCriteriaInput, setExclusionCriteriaInput] = useState("");
  
  const [, navigate] = useLocation();

  const deleteTitle = useCallback(() => {
    setTitle("");
  }, []);

  const handleFilesSelected = useCallback((files: File[]) => {
    setSelectedFiles((prev) => [...prev, ...files]);
  }, []);

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
      alert("Title is required");
      return;
    }
    if (selectedFiles.length === 0) {
      alert("At least one file must be added");
      return;
    }
    try {
      await CreateProject({
        title,
        files: selectedFiles,
        inclusionCriteria,
        exclusionCriteria,
      });
      navigate("/projects");
      alert('Project created successfully!');
    } catch (error) {
      console.error(error);
      alert('Creating project failed!');
    }
  }, [title, selectedFiles, inclusionCriteria, exclusionCriteria, navigate]);

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
            <ul className="text-sm text-gray-700 space-y-1">
              {title ? (
                <li className="flex justify-between items-center">
                  <span>{title}</span>
                  <button
                    className="text-red-500 text-sm hover:underline"
                    onClick={deleteTitle}
                  >
                    Delete
                  </button>
                </li>
              ) : (
                <li className="text-gray-400 italic">No title yet</li>
              )}
            </ul>
          </div>

          <div className="grid grid-cols-[200px_1fr] items-start gap-4">
            <H6>
              List of papers<span className="text-red-500 font-semibold">*</span>
            </H6>
            <div className="w-full">
              <FileDropArea onFilesSelected={handleFilesSelected}/>
            </div>
          </div>

          <div className="grid grid-cols-[200px_1fr] items-start gap-4">
            <div></div>

            <ul className="text-sm text-gray-700 space-y-1">
              {selectedFiles.length === 0 && (
                <li className="text-gray-400 italic">No files selected yet</li>
              )}
              {selectedFiles.map((file, idx) => (
                <li key={idx} className="flex justify-between items-center">
                  <span>{file.name}</span>
                  <button
                    className="text-red-500 text-sm hover:underline"
                    onClick={() => removeFile(idx)}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-[200px_1fr] items-start gap-4">
            <H6>Inclusion Criteria</H6>
            <div className="flex justify-between items-center gap-4">
              <input
                type="text"
                className="border border-gray-300 rounded-2xl py-2 px-4 w-full shadow-sm focus:outline-none"
                placeholder="Inclusion criterion"
                value={inclusionCriteriaInput}
                onChange={(e) => setInclusionCriteriaInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleInclusionSetup();
                  }
                }}
              />
              <button
                className="bg-green-500 text-white h-8 w-16 rounded-full brightness-110 shadow-sm
                hover:bg-green-400 hover:drop-down-brightness-125 transition duration-200 ease-in-out"
                onClick={() => handleInclusionSetup()}
              >
                Add
              </button>
            </div>
          </div>

          {showCriteriaList(inclusionCriteria, deleteInclusionCriteria)}

          <div className="grid grid-cols-[200px_1fr] items-center gap-4">
            <H6>Exclusion Criteria</H6>
            <div className="flex justify-between items-center gap-4">
              <input
                type="text"
                className="border border-gray-300 rounded-2xl py-2 px-4 w-full shadow-sm focus:outline-none"
                placeholder="Exclusion criterion"
                value={exclusionCriteriaInput}
                onChange={(e) => setExclusionCriteriaInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleExclusionSetup();
                  }
                }}
              />
              <button
                className="bg-green-500 text-white h-8 w-16 rounded-full brightness-110 shadow-sm
                hover:bg-green-400 hover:drop-down-brightness-125 transition duration-200 ease-in-out"
                onClick={() => handleExclusionSetup()}
              >
                Add
              </button>
            </div>
          </div>

          {showCriteriaList(exclusionCriteria, deleteExclusionCriteria)}

          <div className="flex justify-end items-end gap-4">
            <button
              className="bg-red-600 text-white font-semibold h-12 w-24 rounded-full brightness-110 shadow-md hover:bg-red-500 hover:drop-down-brightness-125 transition duration-200 ease-in-out"
              onClick={() => {
                console.log("Project creation cancelled");
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
              className="bg-blue-600 text-white font-semibold h-12 w-24 rounded-full brightness-110 shadow-md hover:bg-blue-500 hover:drop-down-brightness-125 transition duration-200 ease-in-out"
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