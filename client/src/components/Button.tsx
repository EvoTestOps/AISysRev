import { twMerge } from "tailwind-merge";
import React from "react";
import classNames from "classnames";

type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl";
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "green" | "yellow" | "red" | "purple" | "gray";
  size?: ButtonSize;
};

const variantClasses: Record<string, string> = {
  green: "bg-green-600 hover:bg-green-500",
  yellow: "bg-yellow-500 hover:bg-yellow-400",
  red: "bg-red-500 hover:bg-red-400",
  purple: "bg-purple-700 hover:bg-purple-600",
  gray: "bg-gray-700 hover:bg-gray-600",
};

const sizeClasses: Record<ButtonSize, string> = {
  xl: "text-xl",
  lg: "text-lg",
  md: "text-md",
  sm: "text-sm",
  xs: "text-xs",
};

export const Button: React.FC<ButtonProps> = ({
  variant = "green",
  size = "sm",
  className,
  children,
  ...rest
}) => (
  <button
    className={twMerge(
      classNames(
        "px-3 py-2 text-white font-semibold rounded-lg shadow-md transition duration-200 ease-in-out cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none flex flex-row items-center content-center gap-2",
        variantClasses[variant],
        sizeClasses[size],
        className
      )
    )}
    {...rest}
  >
    {children}
  </button>
);
