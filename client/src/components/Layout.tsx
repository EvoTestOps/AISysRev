import { PropsWithChildren } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";
import { twMerge } from "tailwind-merge";
import { NavigationBar } from "./NavigationBar";

type LayoutProps = {
  title: string;
  className?: string;
  navbarActionComponent?: () => React.ReactNode;
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
          navbarExtraComponent={navbarActionComponent}
        />
      )}

      <div
        className={twMerge(
          "mt-8 lg:w-4xl md:w-full mr-auto ml-auto",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
};
