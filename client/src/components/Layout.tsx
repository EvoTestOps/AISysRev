import { PropsWithChildren } from "react";
import { Helmet } from "react-helmet-async";
import { twMerge } from "tailwind-merge";
import { NavigationBar } from "./NavigationBar";
import { PageHeader } from "./PageHeader";

type LayoutProps = {
  title: string;
  className?: string;
  /** Page-level actions, shown next to the title. */
  headerActions?: React.ReactNode;
  hideNavbar?: boolean;
};

export const Layout = ({
  title,
  children,
  className,
  headerActions,
  hideNavbar,
}: PropsWithChildren<LayoutProps>) => {
  return (
    <div className="flex flex-col min-h-screen">
      <Helmet>
        <title>{title}</title>
      </Helmet>

      {!hideNavbar && <NavigationBar />}

      <div
        className={twMerge(
          "mt-8 p-6 w-full lg:p-0 lg:w-4xl xl:w-6xl 2xl:w-7xl mr-auto ml-auto",
          className
        )}
      >
        {!hideNavbar && <PageHeader title={title} actions={headerActions} />}
        {children}
      </div>
      <footer className="mt-auto py-4 flex justify-end gap-6 pr-8 text-sm text-slate-900">
        <a href="/terms-and-conditions" target="_blank" rel="noreferrer" className="hover:text-slate-600 underline">
          Terms and Conditions
        </a>
        <a href="/register-and-privacy-policy" target="_blank" rel="noreferrer" className="hover:text-slate-600 underline">
          Register and Privacy Policy
        </a>
      </footer>
    </div>
  );
};
