import { PropsWithChildren } from "react";

export const Page: React.FC<PropsWithChildren> = ({ children }) => (
  <div className="mt-8 w-2/3 mr-auto ml-auto">{children}</div>
);
