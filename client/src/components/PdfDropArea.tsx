import { useState, useRef, DragEvent } from "react";
import { toast } from "react-toastify";
import classNames from 'classnames';
import DragAndDropIcon from "../assets/images/DragDropIcon.png";

type PdfDropAreaProps = {
  onFilesSelected?: (files: File[]) => void;
};

export const PdfDropArea: React.FC<PdfDropAreaProps> = ({ onFilesSelected }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const preventDefaults = (e: DragEvent) => e.preventDefault();

  const getValidPdfFiles = (files: File[]): File[] => {
    return files.filter(
      (file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    )
  };

  const validatePdfFiles = async (files: File[]) => {
    let validFiles: File[] = []

    try {
      validFiles = getValidPdfFiles(files);
    } catch (error) {
      console.error("Failed to get valid PDF files:", error);
      toast.error("An error occurred while validating files.");
    }

    const invalidCount = files.length - validFiles.length;

    if (validFiles.length === 0) {
      toast.error("Only PDF files are allowed.");
      return;
    }

    if (invalidCount > 0) {
      toast.error(`${invalidCount} file(s) were skipped because they are not PDF files.`);
    }

    onFilesSelected?.(validFiles);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    preventDefaults(e);
    setIsDragging(false);
    validatePdfFiles(Array.from(e.dataTransfer.files));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      validatePdfFiles(Array.from(e.target.files));
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
          "flex flex-col justify-center items-center py-4 border-2 border-dashed border-gray-400 transition-colors duration-200 rounded-lg hover:cursor-pointer",
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
            "pb-2 max-h-20 max-w-20 transition-opacity duration-500 select-none",
            {
            "opacity-100 brightness-90": isDragging,
            "opacity-80": !isDragging,
            }
          )}
        />
        <span
          className={classNames(
            "text-sm text-pretty font-medium text-gray-600 transition-colors duration-200 select-none",
            {
              "opacity-70": isDragging,
              "opacity-40": !isDragging,
            }
          )}
        >
          Drag & drop PDF files or click to upload
        </span>
      </div>

      <input
        type="file"
        accept=".pdf"
        multiple={true}
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
};