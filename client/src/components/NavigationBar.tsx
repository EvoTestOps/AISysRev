import { Link } from "wouter";
import { H3 } from "./Typography";
import universityLogo from "../assets/images/HY__LD01_LogoFP_EN_B3____BW.png";

type NavigationBarProps = {
  name: string;
};

export const NavigationBar = ({ name }: NavigationBarProps) => {
  return (
    <nav
      className="flex justify-between items-start ml-4 py-8"
      aria-label="Global"
    >
      <div className="flex items-start mr-16 ml-4 flex-shrink-0">
        <a href="https://www.helsinki.fi/en" className="m-0">
          <span className="sr-only">University of Helsinki</span>
          <img
            className="h-20 w-auto"
            src={universityLogo}
            alt=""
          />
        </a>
      </div>

      <div className="flex items-end justify-between w-4xl mt-20">
        <div className="m-4">
          <H3>{name}</H3>
        </div>
        <Link
          href="/create"
          className="m-4 inline-block bg-green-500 text-white text-sm text-center px-6 py-2 rounded-md hover:bg-green-500/90 transition-colors duration-200"
        >
          +
        </Link>
      </div>

      <div className="flex items-start mr-8 ml-16 py-4 space-x-8">
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
