import { PropsWithChildren } from "react";

export const Page: React.FC<PropsWithChildren> = ({ children }) => (
  <div className="bg-zinc-50 mt-8 w-2/3 p-4 mr-auto ml-auto">{children}</div>
);
