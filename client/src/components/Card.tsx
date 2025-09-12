import classNames from "classnames";
import { twMerge } from "tailwind-merge";

export type CardProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
> & { variant?: "success" | "danger" | "warning"; padding?: string };

export const Card: React.FC<React.PropsWithChildren<CardProps>> = ({
  children,
  className,
  variant,
  padding = "p-4",
  ...rest
}) => (
  <div
    className={twMerge(
      classNames(
        "rounded-lg shadow-sm",
        {
          "bg-white": !variant,
          "bg-green-200": variant == "success",
          "bg-red-200": variant == "danger",
          "bg-yellow-200": variant == "warning",
        },
        padding,
        className
      )
    )}
    {...rest}
  >
    <div className={`flex flex-col gap-5`}>{children}</div>
  </div>
);
