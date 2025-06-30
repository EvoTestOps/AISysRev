import { PropsWithChildren, HTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

type HeadingProps = PropsWithChildren & HTMLAttributes<HTMLHeadingElement>;

export const H1: React.FC<
  React.DetailedHTMLProps<
    HTMLAttributes<HTMLHeadingElement>,
    HTMLHeadingElement
  >
> = ({ children, className = "", ...props }: HeadingProps) => (
  <h1
    className={twMerge("text-5xl font-semibold tracking-normal", className)}
    {...props}
  >
    {children}
  </h1>
);

export const H2: React.FC<
  React.DetailedHTMLProps<
    HTMLAttributes<HTMLHeadingElement>,
    HTMLHeadingElement
  >
> = ({ children, className = "", ...props }: HeadingProps) => (
  <h2
    className={twMerge("text-4xl font-semibold tracking-normal", className)}
    {...props}
  >
    {children}
  </h2>
);

export const H3: React.FC<
  React.DetailedHTMLProps<
    HTMLAttributes<HTMLHeadingElement>,
    HTMLHeadingElement
  >
> = ({ children, className = "", ...props }: HeadingProps) => (
  <h3
    className={twMerge("text-3xl font-semibold tracking-normal", className)}
    {...props}
  >
    {children}
  </h3>
);

export const H4: React.FC<
  React.DetailedHTMLProps<
    HTMLAttributes<HTMLHeadingElement>,
    HTMLHeadingElement
  >
> = ({ children, className = "", ...props }: HeadingProps) => (
  <h4
    className={twMerge("text-2xl font-semibold tracking-normal", className)}
    {...props}
  >
    {children}
  </h4>
);

export const H5: React.FC<
  React.DetailedHTMLProps<
    HTMLAttributes<HTMLHeadingElement>,
    HTMLHeadingElement
  >
> = ({ children, className = "", ...props }: HeadingProps) => (
  <h5
    className={twMerge("text-xl font-semibold tracking-normal", className)}
    {...props}
  >
    {children}
  </h5>
);

export const H6: React.FC<
  React.DetailedHTMLProps<
    HTMLAttributes<HTMLHeadingElement>,
    HTMLHeadingElement
  >
> = ({ children, className = "", ...props }: HeadingProps) => (
  <h6
    className={twMerge("text-lg font-semibold tracking-normal", className)}
    {...props}
  >
    {children}
  </h6>
);
