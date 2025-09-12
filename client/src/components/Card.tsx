import { twMerge } from "tailwind-merge";

type CardProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
> & { direction?: "col" | "row" };

export const Card: React.FC<React.PropsWithChildren<CardProps>> = ({
  children,
  className,
  direction = "col",
  ...rest
}) => (
  <div
    className={twMerge("bg-white p-4 rounded-lg shadow-sm", className)}
    {...rest}
  >
    <div className={`flex flex-${direction} gap-5`}>{children}</div>
  </div>
);
