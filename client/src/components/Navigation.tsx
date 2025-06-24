import { Link, useLocation } from "wouter";
import { useTypedStoreState } from "../state/store";
import universityLogo from "../assets/images/HY__LD01_LogoFP_EN_B3____BW.png";

export function Navigation() {
  const user = useTypedStoreState((state) => state.user);
  const [, navigate] = useLocation();
  return (
    <nav
      className="flex items-center justify-between p-6 lg:px-8 flex-nowrap"
      aria-label="Global"
    >
      <div className="flex-shrink-0">
        <a href="#" className="-m-1.5 p-1.5">
          <span className="sr-only">University of Helsinki</span>
          <img
            className="h-20 w-auto"
            src={universityLogo}
            alt=""
          />
        </a>
      </div>

      <div className="flex gap-x-6 sm:gap-x-8 md:gap-x-12 lg:gap-x-24 items-center">
        <Link href="/" className="text-xs sm:text-sm font-semibold text-gray-900">
          Home
        </Link>
        <Link
          href="/terms-and-conditions"
          className="text-xs sm:text-sm font-semibold text-gray-900"
        >
          Terms and conditions
        </Link>
        <Link href="/privacy" className="text-xs sm:text-sm font-semibold text-gray-900">
          Privacy
        </Link>
      </div>

      <div className="flex-shrink-0">
        {!user && (
          <Link href="/login" className="text-xs sm:text-sm font-semibold text-gray-900">
            Log in <span aria-hidden="true">&rarr;</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
