import { twMerge } from "tailwind-merge";
import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "green" | "yellow" | "red" | "purple";
};

const variantClasses: Record<string, string> = {
  green: "bg-green-600 hover:bg-green-500",
  yellow: "bg-yellow-500 hover:bg-yellow-400",
  red: "bg-red-500 hover:bg-red-400",
  purple: "bg-purple-700 hover:bg-purple-600",
};

export const Button: React.FC<ButtonProps> = ({
  variant = "green",
  className,
  ...props
}) => (
  <button
    className={twMerge(
      "px-4 py-2 text-white text-sm font-semibold rounded-md shadow-md transition duration-200 ease-in-out cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
      variantClasses[variant],
      className
    )}
    {...props}
  />
);