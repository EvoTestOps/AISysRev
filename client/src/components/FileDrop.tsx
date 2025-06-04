import { useState, useRef, DragEvent } from "react";
import classNames from 'classnames';
import DragAndDropIcon from "../assets/images/DragDropIcon.png";
import { FileDropProps } from "../state/types";

export const FileDropArea: React.FC<FileDropProps> = ({ onFilesSelected }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const preventDefaults = (e: DragEvent) => e.preventDefault();

  const getValidCsvFiles = (files: File[]): File[] => {
    return files.filter(
      (file) => file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv")
    )
  };

  const handleFiles = (files: File[]) => {
    const validFiles = getValidCsvFiles(files);
    
    if (validFiles.length > 0) {
      onFilesSelected?.(validFiles);
    } else {
      alert("Only CSV files are allowed.")
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    preventDefaults(e);
    setIsDragging(false);
    handleFiles(Array.from(e.dataTransfer.files));

  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
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