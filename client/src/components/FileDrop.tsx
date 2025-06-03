import { useState, DragEvent } from "react";
import DragAndDropIcon from "../assets/images/DragDropIcon.png"

type FileDropProps = {
  onFilesDropped?: (files: File[]) => void;
};

export const FileDropZone: React.FC<FileDropProps> = ({ onFilesDropped }) => {
  const [isDragging, setIsDragging] = useState(false);

  const preventDefaults = (e: DragEvent) => e.preventDefault();

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    preventDefaults(e);
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFilesDropped?.(files);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        preventDefaults(e);
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        preventDefaults(e);
        setIsDragging(false);
      }}
      onDrop={handleDrop}
      className={`flex flex-col justify-center items-center h-40 w-80 border-2 border-dashed border-gray-500 transition-colors duration-200 rounded-lg ${
        isDragging ? "bg-slate-300/90" : "bg-slate-300/30"
      }`}
    >
      <img
        src={DragAndDropIcon}
        alt="Drag and Drop Icon"
        className={`pb-2 max-h-20 max-w-20 transition-opacity duration-500 ${
          isDragging ? "opacity-100 brightness-90" : "opacity-80"
        }`}
      />
      <span className={`text-sm text-pretty font-medium text-gray-600 transition-colors duration-200 ${
          isDragging ? "opacity-70" : "opacity-40"
        }`}>
          Drag & drop csv-files here
      </span>
    </div>
  );
};