import { Helmet } from "react-helmet-async";
import { Page } from "../components/Layout";
import { H1 } from "../components/Typography";
import { useTypedStoreActions } from "../state/store";

export const LoginPage = () => {
  const { setUserMock } = useTypedStoreActions((actions) => actions);
  return (
    <Page>
      <Helmet>
        <title>Login</title>
      </Helmet>
      <H1>Login</H1>
      <form className="mt-8 w-full max-w-sm">
        <div className="md:flex md:items-center mb-6">
          <div className="md:w-1/3">
            <label
              className="block text-gray-500 font-bold mb-1 md:mb-0 pr-4"
              htmlFor="inline-email"
            >
              Email address
            </label>
          </div>
          <div className="md:w-2/3">
            <input
              className="bg-gray-200 appearance-none border-2 border-gray-200 rounded w-full py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-purple-500"
              id="inline-email"
              type="email"
              placeholder="someone@example.com"
            />
          </div>
        </div>
        <div className="md:flex md:items-center mb-6">
          <div className="md:w-1/3">
            <label
              className="block text-gray-500 font-bold mb-1 md:mb-0 pr-4"
              htmlFor="inline-password"
            >
              Password
            </label>
          </div>
          <div className="md:w-2/3">
            <input
              className="bg-gray-200 appearance-none border-2 border-gray-200 rounded w-full py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-purple-500"
              id="inline-password"
              type="password"
              placeholder="******************"
            />
          </div>
        </div>
        <div className="md:flex md:items-center">
          <div className="md:w-1/3"></div>
          <div className="md:w-2/3 flex gap-2">
            <button
              className="shadow bg-purple-500 hover:bg-purple-400 focus:shadow-outline focus:outline-none text-white font-bold py-2 px-4 rounded hover:cursor-pointer"
              type="button"
            >
              Log in
            </button>
            <button
              onClick={() => setUserMock()}
              className="shadow bg-blue-500 hover:bg-blue-400 focus:shadow-outline focus:outline-none text-white font-bold py-2 px-4 rounded hover:cursor-pointer"
              type="button"
            >
              Log in (mock)
            </button>
          </div>
        </div>
      </form>
    </Page>
  );
};
