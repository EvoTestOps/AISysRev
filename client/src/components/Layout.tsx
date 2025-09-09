import { PropsWithChildren } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";
import { twMerge } from "tailwind-merge";
import { NavigationBar } from "./NavigationBar";

type LayoutProps = {
  title: string;
  className?: string;
  navbarActionComponent?: React.ElementType;
};

export const Layout = ({
  title,
  children,
  className,
  navbarActionComponent,
}: PropsWithChildren<LayoutProps>) => {
  const [location] = useLocation();

  const hideNavBar = location === "/terms";

  return (
    <div className="flex flex-col min-h-screen">
      <Helmet>
        <title>{title}</title>
      </Helmet>

      {!hideNavBar && (
        <NavigationBar
          name={title}
          navbarActionComponent={navbarActionComponent}
        />
      )}

      <div
        className={twMerge(
          "mt-8 p-6 w-full lg:p-0 lg:w-4xl mr-auto ml-auto",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
};
