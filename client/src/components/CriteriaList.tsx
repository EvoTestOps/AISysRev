import classNames from "classnames";
import React from "react";
import { AlertMessage } from "./AlertMessage";

export type CriteriaListProps = {
  criteria: string[];
  onDelete?: (index: number) => void;
} & React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
>;

export const CriteriaList: React.FC<CriteriaListProps> = ({
  criteria,
  onDelete,
  className,
  ...rest
}) => {
  if (!criteria) return null;

  return (
    <div className={classNames("flex flex-col gap-1", className)} {...rest}>
      {criteria.length === 0 && <AlertMessage message="No criteria." />}
      <ol className="list-decimal pl-6 space-y-4">
        {criteria.map((criterion, index) => (
          <li key={index}>
            <div className="text-gray-700 flex justify-between items-center pr-2">
              <span className="flex-1 break-words max-w-full">{criterion}</span>
              {onDelete && (
                <button
                  className="text-red-500 text-sm ml-4 hover:underline whitespace-nowrap cursor-pointer"
                  onClick={() => onDelete(index)}
                >
                  Delete
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
};
