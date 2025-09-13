import { twMerge } from "tailwind-merge";
import React from "react";
import classNames from "classnames";
import { Link } from "wouter";

type LinkButtonSize = "xs" | "sm" | "md" | "lg" | "xl";

// Issue with Wouter's LinkProps prevent us from directly using it
type LinkButtonProps = {
  variant?: "green" | "yellow" | "red" | "purple" | "gray";
  size?: LinkButtonSize;
  className?: string;
  href: string;
};

const variantClasses: Record<string, string> = {
  green: "bg-green-600 hover:bg-green-500",
  yellow: "bg-yellow-500 hover:bg-yellow-400",
  red: "bg-red-500 hover:bg-red-400",
  purple: "bg-purple-700 hover:bg-purple-600",
  gray: "bg-gray-700 hover:bg-gray-600",
};

const sizeClasses: Record<LinkButtonSize, string> = {
  xl: "text-xl",
  lg: "text-lg",
  md: "text-md",
  sm: "text-sm",
  xs: "text-xs",
};

export const LinkButton: React.FC<React.PropsWithChildren<LinkButtonProps>> = ({
  variant = "green",
  size = "sm",
  className,
  href,
  ...rest
}) => (
  <Link
    href={href}
    className={twMerge(
      classNames(
        "px-3 py-2 text-white font-semibold rounded-lg shadow-md transition duration-200 ease-in-out cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none flex flex-row items-center content-center gap-2",
        variantClasses[variant],
        sizeClasses[size],
        className
      )
    )}
    {...rest}
  />
);
