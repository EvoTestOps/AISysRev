import { Plus } from "lucide-react";

type CriteriaInputProps = {
  placeholder: string;
  value: string;
  setCriteriaInput: (val: string) => void;
  handleSetup: () => void;
};

export const CriteriaInput: React.FC<CriteriaInputProps> = (props) => {
  return (
    <div className="grid grid-cols-[1fr_78px] items-center gap-4 h-10">
      <input
        type="text"
        className="border border-gray-300 pr-4 pl-4 rounded-lg shadow-md h-full w-full focus:outline-none"
        placeholder={props.placeholder}
        value={props.value}
        onChange={(e) => props.setCriteriaInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            props.handleSetup();
          }
        }}
      />
      <button
        className="bg-green-600 font-semibold text-white text-sm hover:cursor-pointer rounded-lg shadow-md flex items-center content-center justify-center
          hover:bg-green-500 transition duration-200 ease-in-out h-full"
        onClick={() => props.handleSetup()}
      >
        <div className="flex flex-row items-center gap-2">
          <Plus size={16} />
          <span>Add</span>
        </div>
      </button>
    </div>
  );
};
