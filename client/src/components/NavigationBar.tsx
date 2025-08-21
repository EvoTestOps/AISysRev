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
    <nav
      className="bg-neutral-50 flex justify-between items-start py-8"
      aria-label="Global"
    >
      <div className="flex flex-col gap-2 items-start mr-8 ml-8 flex-shrink-0">
        <a href="https://github.com/EvoTestOps" className="m-0">
          <span className="sr-only">EvoTestOps</span>
          <img className="h-20 w-auto" src={universityLogo} alt="" />
        </a>
        {appEnv !== "prod" && (
          <div className="bg-red-500 text-white uppercase font-bold p-2 rounded-sm">
            {appEnv}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between w-4xl mt-20">
        <div className="m-4">
          <H3>{name}</H3>
        </div>
        {name === "Projects" && (
          <Link href="/create" className="pr-2">
            <Plus
              className="
              bg-green-600 text-white 
              h-6 w-12 mt-1 md:mt-4
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

      <div className="flex items-start mr-8 ml-8 py-4 space-x-8">
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
        <Link
          href="/privacy"
          className="text-xs sm:text-sm font-semibold text-gray-900"
        >
          FAQ
        </Link>
      </div>
    </nav>
  );
};
