import { twMerge } from "tailwind-merge";
import React from "react";
import classNames from "classnames";
import { Link } from "wouter";

type LinkButtonSize = "xs" | "sm" | "md" | "lg" | "xl";

// Issue with Wouter's LinkProps prevent us from directly using it
type LinkButtonProps = {
  variant?: "green" | "yellow" | "red" | "purple" | "gray";
  size?: LinkButtonSize;
  invert?: boolean;
  className?: string;
  href: string;
};

export const LinkButton: React.FC<React.PropsWithChildren<LinkButtonProps>> = ({
  variant = "green",
  size = "sm",
  className,
  href,
  invert = false,
  ...rest
}) => (
  <Link
    role="button"
    href={href}
    className={twMerge(
      classNames(
        "border-2 px-3 py-2 text-white font-semibold rounded-lg shadow-md transition duration-200 ease-in-out cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed select-none flex flex-row items-center content-center gap-2",
        {
          "border-green-600 bg-green-600 hover:bg-green-500":
            variant === "green",
          "border-purple-700 bg-purple-700 hover:bg-purple-600":
            variant === "purple",
          "border-yellow-500 bg-yellow-500 hover:bg-yellow-400":
            variant === "yellow",
          "border-red-500 bg-red-500 hover:bg-red-400": variant === "red",
          "border-gray-700 bg-gray-700 hover:bg-gray-600": variant === "gray",
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
          "text-green-600 hover:bg-green-100": invert && variant === "green",
          "border-yellow-700 text-yellow-700 hover:bg-yellow-200":
            invert && variant === "yellow",
          "text-red-500 hover:bg-red-100": invert && variant === "red",
          "text-purple-700 hover:bg-purple-100": invert && variant === "purple",
          "text-gray-700 hover:bg-gray-100": invert && variant === "gray",
        },
        className
      )
    )}
    {...rest}
  />
);
