import classNames from "classnames";
import { twMerge } from "tailwind-merge";
import { Link, LinkProps } from "wouter";

type TabButtonProps = {
  active?: boolean;
} & LinkProps;

export const TabButton: React.FC<TabButtonProps> = ({
  children,
  active = false,
  href,
  ...rest
}) => {
  return (
    // @ts-expect-error Expect error
    <Link
      href={href}
      {...rest}
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
    </Link>
  );
};
