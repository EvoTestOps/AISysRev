import classNames from "classnames";
import { CircleAlert } from "lucide-react";
import { twMerge } from "tailwind-merge";

type AlertMessageProps = {
  message: string;
} & React.HTMLAttributes<HTMLDivElement>;

export const AlertMessage: React.FC<AlertMessageProps> = ({
  message,
  className,
  ...rest
}) => (
  <div
    className={twMerge(
      classNames(
        "text-gray-500 pb-4 flex flex-row gap-2 items-center",
        className
      )
    )}
    {...rest}
  >
    <CircleAlert size={20} strokeWidth={3} />
    <span>{message}</span>
  </div>
);
