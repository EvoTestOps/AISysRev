import { PropsWithChildren } from "react";

export const H1: React.FC<PropsWithChildren> = ({ children }) => (
  <h1 className="text-5xl font-semibold tracking-normal">{children}</h1>
);
export const H2: React.FC<PropsWithChildren> = ({ children }) => (
  <h2 className="text-4xl font-semibold tracking-normal">{children}</h2>
);
export const H3: React.FC<PropsWithChildren> = ({ children }) => (
  <h3 className="text-3xl font-semibold tracking-normal">{children}</h3>
);
export const H4: React.FC<PropsWithChildren> = ({ children }) => (
  <h4 className="text-2xl font-semibold tracking-normal">{children}</h4>
);
export const H5: React.FC<PropsWithChildren> = ({ children }) => (
  <h5 className="text-xl font-semibold tracking-normal">{children}</h5>
);
export const H6: React.FC<PropsWithChildren> = ({ children }) => (
  <h6 className="text-lg font-semibold tracking-normal">{children}</h6>
);
