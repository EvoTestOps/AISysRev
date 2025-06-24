import { Link } from "wouter";
import { H3 } from "./Typography";
import { Plus } from "lucide-react";
import universityLogo from "../assets/images/HY__LD01_LogoFP_EN_B3____BW.png";

type NavigationBarProps = {
  name: string;
};

export const NavigationBar = ({ name }: NavigationBarProps) => {
  return (
    <nav
      className="bg-zinc-50 flex justify-between items-start ml-4 py-8"
      aria-label="Global"
    >
      <div className="flex items-start mr-8 ml-4 flex-shrink-0">
        <a href="https://www.helsinki.fi/en" className="m-0">
          <span className="sr-only">University of Helsinki</span>
          <img
            className="h-20 w-auto"
            src={universityLogo}
            alt=""
          />
        </a>
      </div>

      <div className="flex items-center justify-between w-4xl mt-20">
        <div className="m-4">
          <H3>{name}</H3>
        </div>
        {name === "Projects" && (
        <Link href="/create" className="">
          <Plus
            className="
              bg-green-500 text-white 
              h-6 w-12 mt-4
              rounded-full
              brightness-110
              shadow-sm
              hover:bg-green-400
              hover:drop-down-brightness-125
              transition duration-200 ease-in-out
            "
          />
        </Link>
        )}
      </div>

      <div className="flex items-start mr-8 ml-8 py-4 space-x-8">
        <Link href="/" className="text-xs sm:text-sm font-semibold text-gray-900">
          About
        </Link>
        <Link href="/privacy" className="text-xs sm:text-sm font-semibold text-gray-900">
          FAQ
        </Link>
      </div>
    </nav>
  );
};
