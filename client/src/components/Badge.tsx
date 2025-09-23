import classNames from "classnames";
import { twMerge } from "tailwind-merge";

type BadgeProps = {
  invert?: boolean;
  text: string;
};

export const Badge: React.FC<BadgeProps> = ({ invert = false, text }) => (
  <div
    className={twMerge(
      classNames(
        "bg-white text-purple-700 pl-2 pr-2 rounded-md inline-flex items-center content-center justify-center font-bold select-none",
        {
          "bg-purple-700 text-white": invert,
        }
      )
    )}
  >
    {text}
  </div>
);
