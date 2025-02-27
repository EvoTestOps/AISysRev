import { Link } from "wouter";
import { H1 } from "./Typography";

export function Hero() {
  return (
    <div className="text-center">
      <H1>Automate Title-Abstract Screening Using AI.</H1>
      <p className="mt-8 text-lg font-medium text-pretty text-gray-500 sm:text-xl/8">
        Reduce the time and effort taken in the screening phase of systematic
        reviews.
      </p>
      <div className="mt-10 flex items-center justify-center gap-x-6">
        <Link href="/about" className="text-sm/6 font-semibold text-gray-900">
          Learn more <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
