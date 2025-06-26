import { useState, useRef, DragEvent } from "react";
import { toast } from "react-toastify";
import classNames from 'classnames';
import DragAndDropIcon from "../assets/images/DragDropIcon.png";

type FileDropAreaProps = {
  onFilesSelected?: (files: File[]) => void;
};

export const FileDropArea: React.FC<FileDropAreaProps> = ({ onFilesSelected }) => {
  const [isDragging, setIsDragging] = useState(false);
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
      toast.error("An error occurred while validating files.");
    }

    const invalidCount = files.length - validFiles.length;

    if (validFiles.length === 0) {
      toast.error("Only CSV files are allowed.");
      return;
    }

    if (invalidCount > 0) {
      toast.error(`${invalidCount} file(s) were skipped because they are not CSV files.`);
    }

    onFilesSelected?.(validFiles);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    preventDefaults(e);
    setIsDragging(false);
    validateCsvFiles(Array.from(e.dataTransfer.files));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      validateCsvFiles(Array.from(e.target.files));
    }
  };

  return (
    <div>
      <div
        onClick={() => fileInputRef.current?.click()}
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
          "flex flex-col justify-center items-center px-32 py-4 border-2 border-dashed border-gray-400 transition-colors duration-200 rounded-lg",
          {
          "bg-slate-100": isDragging,
          "bg-white": !isDragging,
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