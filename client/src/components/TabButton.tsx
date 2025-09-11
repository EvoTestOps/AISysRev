import classNames from "classnames";
import { twMerge } from "tailwind-merge";

type TabButtonProps = {
  active?: boolean;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
};

export const TabButton: React.FC<React.PropsWithChildren<TabButtonProps>> = ({
  children,
  active = false,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={twMerge(
        classNames(
          "h-12 min-w-40 border-slate-800 border-2 font-bold first:rounded-l-lg last:rounded-r-lg flex items-center content-center justify-center p-4 hover:cursor-pointer transition delay-50",
          {
            "bg-slate-800 text-white": active,
            "hover:bg-slate-300": !active,
          }
        )
      )}
    >
      {children}
    </div>
  );
};
