import { H6 } from "./Typography";

type CriteriaInputProps = {
  label: string;
  placeholder: string;
  value: string;
  setCriteriaInput: (val: string) => void;
  handleSetup: () => void;
};

export const CriteriaInput: React.FC<CriteriaInputProps> = (props) => {
  return (
    <div className="grid grid-cols-[200px_1fr] items-center gap-4">
      <H6>{props.label}</H6>
      <div className="flex justify-between items-center gap-4">
        <input
          type="text"
          className="border border-gray-300 rounded-lg shadow-md p-3 w-full focus:outline-none"
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
          className="bg-green-600 font-semibold text-white text-sm hover:cursor-pointer p-2 rounded-lg shadow-md flex items-center content-center
          hover:bg-green-500 transition duration-200 ease-in-out"
          onClick={() => props.handleSetup()}
        >
          Add
        </button>
      </div>
    </div>
  );
};
