import { Link } from "wouter";
import { H3 } from "./Typography";
import evoTestOpsLogo from "../assets/images/evotestops.png";

type NavigationBarProps = {
  name: string;
  navbarActionComponent?: React.ElementType;
};

export const NavigationBar: React.FC<NavigationBarProps> = ({
  name,
  navbarActionComponent,
}) => {
  const appEnv = import.meta.env.VITE_APP_ENV;
  const NavbarActionComponent = navbarActionComponent;
  return (
    <nav className="bg-neutral-50 flex flex-col">
      <div className="flex justify-between p-8">
        <div>
          <Link to="/" className="m-0">
            <span className="sr-only">EvoTestOps</span>
            <img
              className="h-auto w-45"
              src={evoTestOpsLogo}
              alt="EvoTestOps"
            />
          </Link>
          {appEnv === "dev" && (
            <div className="bg-red-500 text-white uppercase font-bold p-2 rounded-sm fixed top-4 left-4 opacity-40 select-none">
              {appEnv}
            </div>
          )}
        </div>
        <div className="flex flex-row gap-4 items-center content-center">
          <Link
            href="/"
            className="text-xs sm:text-sm font-semibold text-gray-900"
          >
            Home
          </Link>
          <Link
            href="/settings"
            className="text-xs sm:text-sm font-semibold text-gray-900"
          >
            Settings
          </Link>
          <Link
            href="/about"
            className="text-xs sm:text-sm font-semibold text-gray-900"
          >
            About
          </Link>
        </div>
      </div>
      <div className="flex justify-between pb-8 lg:w-4xl md:w-full mr-auto ml-auto">
        <div>
          <H3>{name}</H3>
        </div>
        <div className="flex items-center">
          {NavbarActionComponent && <NavbarActionComponent />}
        </div>
      </div>
    </nav>
  );
};
