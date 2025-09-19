import { Plus } from "lucide-react";
import { Button } from "./Button";

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
        className="border border-gray-300 pr-4 pl-4 h-10 rounded-lg shadow-md w-full focus:outline-none"
        placeholder={props.placeholder}
        value={props.value}
        onChange={(e) => props.setCriteriaInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            props.handleSetup();
          }
        }}
      />
      <Button onClick={() => props.handleSetup()}>
        <Plus size={16} />
        <span>Add</span>
      </Button>
    </div>
  );
};
