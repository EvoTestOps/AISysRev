import classNames from "classnames";
import { Square, SquareCheckBig } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { H6 } from "../../components/Typography";

export const SectionHeader: React.FC<{
  title: string;
  disabled?: boolean;
  selected?: boolean;
}> = ({ title, selected, disabled = false }) => (
  <div
    className={twMerge(
      classNames(
        "h-16 grid grid-cols-[1fr_30px] items-center content-center p-4 bg-slate-800 text-white rounded-lg",
        {
          "bg-gray-700 opacity-45": disabled,
        },
      ),
    )}
  >
    <H6 className="select-none">{title}</H6>
    <span>
      {selected === false && <Square size={20} strokeWidth={3} />}
      {selected === true && <SquareCheckBig size={20} strokeWidth={3} className="text-green-500" />}
    </span>
  </div>
);
