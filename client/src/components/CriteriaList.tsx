export const showCriteriaList = (criteria: string[], onDelete: (index: number) => void) => {
  if (criteria.length === 0) return null;
  
  return (
    <div className="grid grid-cols-[200px_1fr] items-start gap-4">
      <div></div>

      <div className="flex flex-col gap-1">
        <ul className="list-disc pl-5 space-y-4">
          {criteria.map((criterion, index) => (
            <li
            key={index}
            className="text-gray-700 flex justify-between items-center"
            >
              <span className="flex-1">{criterion}</span>
              <button
                className="text-red-500 text-sm ml-4 hover:underline whitespace-nowrap"
                onClick={() => onDelete(index)}
                >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};