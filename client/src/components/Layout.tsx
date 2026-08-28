import { PropsWithChildren } from "react";
import { Helmet } from "react-helmet-async";
import { twMerge } from "tailwind-merge";
import { NavigationBar } from "./NavigationBar";

type LayoutProps = {
  title: string;
  className?: string;
  navbarActionComponent?: React.ElementType;
  hideNavbar?: boolean;
};

export const Layout = ({
  title,
  children,
  className,
  navbarActionComponent,
  hideNavbar,
}: PropsWithChildren<LayoutProps>) => {
  const hideNavBar = hideNavbar;

  return (
    <div className="flex flex-col min-h-screen">
      <Helmet>
        <title>{title}</title>
      </Helmet>

      {!hideNavBar && (
        <NavigationBar
          pageTitle={title}
          navbarActionComponent={navbarActionComponent}
        />
      )}

      <div
        className={twMerge(
          "mt-8 p-6 w-full lg:p-0 lg:w-4xl xl:w-6xl 2xl:w-7xl mr-auto ml-auto",
          className
        )}
      >
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
