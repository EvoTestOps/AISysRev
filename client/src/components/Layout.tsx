import { PropsWithChildren } from "react";
import { Helmet } from "react-helmet-async";
import { NavigationBar } from "./NavigationBar";
import { useLocation } from "wouter";

type LayoutProps = {
  title: string;
};

export const Layout = ({ title, children }: PropsWithChildren<LayoutProps>) => {
  const [location] = useLocation();

  const hideNavBar = location === "/terms";

  return (
    <div className="flex flex-col min-h-screen">
      <Helmet>
        <title>{title}</title>
      </Helmet>

      {!hideNavBar && <NavigationBar name={title} />}

      <div className="bg-lightgray mt-8 w-4xl p-4 mr-auto ml-auto">{children}</div>

    </div>
  );
};