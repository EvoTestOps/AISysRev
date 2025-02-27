import { Link } from "wouter";
import { useTypedStoreState } from "../state/store";

export function Navigation() {
  const user = useTypedStoreState((state) => state.user);
  return (
    <nav
      className="flex items-center justify-between p-6 lg:px-8"
      aria-label="Global"
    >
      <div className="flex lg:flex-1">
        <a href="#" className="-m-1.5 p-1.5">
          <span className="sr-only">University of Helsinki</span>
          <img
            className="h-8 w-auto"
            src="https://tailwindui.com/plus/img/logos/mark.svg?color=indigo&shade=600"
            alt=""
          />
        </a>
      </div>
      <div className="hidden lg:flex lg:gap-x-12">
        <Link href="/" className="text-sm/6 font-semibold text-gray-900">
          Home
        </Link>
        <Link
          href="/terms-and-conditions"
          className="text-sm/6 font-semibold text-gray-900"
        >
          Terms and conditions
        </Link>
        <Link href="/privacy" className="text-sm/6 font-semibold text-gray-900">
          Privacy
        </Link>
      </div>
      <div className="flex flex-1 justify-end">
        {!user && (
          <Link href="/login" className="text-sm/6 font-semibold text-gray-900">
            Log in <span aria-hidden="true">&rarr;</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
