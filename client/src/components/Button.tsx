import { twMerge } from "tailwind-merge";
import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "green" | "yellow" | "red" | "primary" | "secondary";
};

const variantClasses: Record<string, string> = {
  green: "bg-green-600 hover:bg-green-500 text-white",
  yellow: "bg-yellow-500 hover:bg-yellow-400 text-white",
  red: "bg-red-500 hover:bg-red-400 text-white",
  purple: "bg-purple-700 hover:bg-purple-600 text-white",
};

export const Button: React.FC<ButtonProps> = ({
  variant,
  className,
  ...props
}) => (
  <button
    className={twMerge(
      "ml-4 mr-4 px-4 py-2 text-sm font-semibold rounded-3xl shadow-md cursor-pointer",
      variantClasses[variant],
      className
    )}
    {...props}
  />
);