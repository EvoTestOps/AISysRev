import React from 'react';

export type CriteriaListProps = {
  criteria: string[];
  onDelete: (index: number) => void;
};

export const CriteriaList: React.FC<CriteriaListProps> = ({ criteria, onDelete }) => {
  if (!criteria) return null;

  return (
    <div className="flex flex-col gap-1 pl-4">
      <ol className="list-decimal pl-4 space-y-4">
        {criteria.map((criterion, index) => (
          <li key={index}>
            <div className="text-gray-700 flex justify-between items-center pr-2">
              <span className="flex-1">{criterion}</span>
              <button
                className="text-red-500 text-sm ml-4 hover:underline whitespace-nowrap cursor-pointer"
                onClick={() => onDelete(index)}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
};