import { PropsWithChildren } from "react";
import { Helmet } from "react-helmet-async";
import { NavigationBar } from "./NavigationBar";
import { Page } from "./Page";

type LayoutProps = {
  title: string;
};

export const Layout = ({ title, children }: PropsWithChildren<LayoutProps>) => {
  return (
    <div className="flex flex-col min-h-screen">
      <Helmet>
        <title>{title}</title>
      </Helmet>

      <NavigationBar name={title} />

      <Page>
        {children}
      </Page>
    </div>
  );
};