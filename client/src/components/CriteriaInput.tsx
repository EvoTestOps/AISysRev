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
    <div className="grid grid-cols-[200px_1fr] items-start gap-4">
      <H6>{props.label}</H6>
      <div className="flex justify-between items-center gap-4">
        <input
          type="text"
          className="border border-gray-300 rounded-2xl py-2 px-4 w-full shadow-sm focus:outline-none"
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
          className="bg-green-600 text-white hover:cursor-pointer h-8 p-2 rounded-md shadow-md flex items-center content-center
          hover:bg-green-500 hover:drop-down-brightness-125 transition duration-200 ease-in-out"
          onClick={() => props.handleSetup()}
        >
          Add
        </button>
      </div>
    </div>
  );
};
