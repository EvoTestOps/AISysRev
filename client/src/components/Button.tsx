import { twMerge } from "tailwind-merge";
import React from "react";
import classNames from "classnames";

type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl";
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "green" | "yellow" | "red" | "purple" | "gray" | "slate";
  size?: ButtonSize;
  invert?: boolean;
};

export const Button: React.FC<ButtonProps> = ({
  variant = "green",
  size = "sm",
  className,
  children,
  invert = false,
  ...rest
}) => (
  <button
    className={twMerge(
      classNames(
        "border-2 px-3 py-2 text-white font-semibold rounded-lg shadow-md transition duration-200 ease-in-out cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed select-none flex flex-row items-center content-center gap-2",
        {
          "border-green-600 bg-green-600 enabled:hover:bg-green-500":
            variant === "green",
          "border-purple-700 bg-purple-700 enabled:hover:bg-purple-600":
            variant === "purple",
          "border-yellow-500 bg-yellow-500 enabled:hover:bg-yellow-400":
            variant === "yellow",
          "border-red-500 bg-red-500 enabled:hover:bg-red-400":
            variant === "red",
          "border-gray-500 bg-gray-500 enabled:hover:bg-gray-400":
            variant === "gray",
          "border-slate-800 bg-slate-800 enabled:hover:bg-slate-600":
            variant === "slate",
        },
        {
          "text-xl": size === "xl",
          "text-lg": size === "lg",
          "text-md": size === "md",
          "text-sm": size === "sm",
          "text-xs": size === "xs",
        },
        {
          "bg-transparent": invert,
          "text-green-600 enabled:hover:bg-green-100":
            invert && variant === "green",
          "border-yellow-700 text-yellow-700 enabled:hover:bg-yellow-200":
            invert && variant === "yellow",
          "text-red-500 enabled:hover:bg-red-100": invert && variant === "red",
          "text-purple-700 enabled:hover:bg-purple-100":
            invert && variant === "purple",
          "text-gray-700 enabled:hover:bg-gray-100":
            invert && variant === "gray",
        },
        className
      )
    )}
    {...rest}
  >
    {children}
  </button>
);
