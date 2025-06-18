import { useState, useRef, DragEvent } from "react";
import classNames from 'classnames';
import DragAndDropIcon from "../assets/images/DragDropIcon.png";
import { fileUploadToBackend } from "../services/fileUploadService";
import { fetch_project_by_uuid, fetch_projects } from "../services/projectService";

export const FileDropArea = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [addedFiles, setAddedFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const preventDefaults = (e: DragEvent) => e.preventDefault();

  const getValidCsvFiles = (files: File[]): File[] => {
    return files.filter(
      (file) => file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv")
    )
  };

  const validateCsvFiles = async (files: File[]) => {
    let validFiles: File[] = []

    try {
      validFiles = getValidCsvFiles(files);
    } catch (error) {
      console.error("Failed to get valid CSV files:", error);
      alert("An error occurred while validating files.");
    }

    const invalidCount = files.length - validFiles.length;

    if (validFiles.length === 0) {
      alert("Only CSV files are allowed.");
      return;
    }

    if (invalidCount > 0) {
      alert(`${invalidCount} file(s) were skipped because they are not CSV files.`);
    }

    try {
      const res = await fileUploadToBackend(validFiles);

      if (res.valid_filenames?.length > 0) {
        setAddedFiles((prev) => [...prev, ...res.valid_filenames]);
      }

    } catch (error: any) {
      if (error.response?.status === 400 && error.response?.data?.detail?.errors) {
        const errors = error.response.data.detail.errors
          .map(
            (e: any) =>
              `File: ${e.file}, Row: ${e.row + 1}, Message: ${e.message}`
          )
          .join("\n");

        alert("Validation errors:\n\n" + errors);
      } else {
        console.error("Upload failed:", error);
        alert("File upload failed. Please try again.");
      }
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    preventDefaults(e);
    setIsDragging(false);
    validateCsvFiles(Array.from(e.dataTransfer.files));
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      validateCsvFiles(Array.from(e.target.files));
    }
  };

  return (
    <div>
      <div
        onClick={handleClick}
        onDragOver={(e) => {
          preventDefaults(e);
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          preventDefaults(e);
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        className={classNames(
          "flex flex-col justify-center items-center h-40 w-80 border-2 border-dashed border-gray-500 transition-colors duration-200 rounded-lg",
          {
          "bg-slate-300/90": isDragging,
          "bg-slate-300/30": !isDragging,
          }
        )}
      >
        <img
          src={DragAndDropIcon}
          alt="Drag and Drop Icon"
          className={classNames(
            "pb-2 max-h-20 max-w-20 transition-opacity duration-500",
            {
            "opacity-100 brightness-90": isDragging,
            "opacity-80": !isDragging,
            }
          )}
        />
        <span
          className={classNames(
            "text-sm text-pretty font-medium text-gray-600 transition-colors duration-200",
            {
              "opacity-70": isDragging,
              "opacity-40": !isDragging,
            }
          )}
        >
          Drag & drop CSV files here or click to upload
        </span>
      </div>

      <div className="flex flex-col">
        <h2 className="font-semibold mb-2">Added Files</h2>
        <ul className="text-sm text-gray-700 space-y-1">
          {addedFiles.length === 0 && <li className="text-gray-400 italic">No files yet</li>}
          {addedFiles.map((file, idx) => (
            <li key={idx}>✅ {file}</li>
          ))}
        </ul>
      </div>

      <input
        type="file"
        accept=".csv"
        multiple
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
};