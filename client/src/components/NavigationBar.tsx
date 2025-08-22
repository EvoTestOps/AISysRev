import { Link } from "wouter";
import { H3 } from "./Typography";
import { Plus } from "lucide-react";
import universityLogo from "../assets/images/HY__LD01_LogoFP_EN_B3____BW.png";

type NavigationBarProps = {
  name: string;
};

export const NavigationBar: React.FC<NavigationBarProps> = ({ name }) => {
  const appEnv = import.meta.env.VITE_APP_ENV;
  return (
    <nav className="bg-neutral-50 flex flex-col">
      <div className="flex justify-between p-8">
        <div>
          <a href="https://github.com/EvoTestOps" className="m-0">
            <span className="sr-only">EvoTestOps</span>
            <img className="h-20 w-auto" src={universityLogo} alt="" />
          </a>
          {appEnv !== "prod" && (
            <div className="bg-red-500 text-white uppercase font-bold p-2 rounded-sm fixed top-4 left-4 opacity-60">
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
          {name === "Projects" && (
            <Link href="/create" className="pr-2">
              <Plus
                className="bg-green-600 text-white 
              h-8 w-8
              rounded-sm
              brightness-110
              shadow-sm
              hover:bg-green-500
              hover:drop-down-brightness-125
              transition duration-200 ease-in-out
            "
              />
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};
