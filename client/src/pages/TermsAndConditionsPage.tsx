import { Helmet } from "react-helmet-async";
import { Layout } from "../components/Layout";
import { H1, H3 } from "../components/Typography";
import { useLocation } from "wouter";
import Cookies from "js-cookie";

export const TermsAndConditionsPage = () => {
  const [, navigate] = useLocation();
  return (
    <Layout title="Terms and Conditions">
      <Helmet>
        <title>Terms and conditions</title>
      </Helmet>
      <H1>Terms and conditions</H1>
      <div className="p-2 flex flex-col gap-4 w-full md:w-3/4 xl:w-2/3 2xl:w-2/3 md:mr-auto md:ml-auto">
        <div className="mt-8 mb-4">
          <H3>AI-automated title-abstract screening PoC</H3>
        </div>
        <div className="flex flex-col gap-2" data-testid="app-instructions">
          <p className="mb-4">
            By using this Proof of Concept (PoC), you acknowledge and agree that
            it is intended for testing purposes only. This PoC should not be
            considered a final solution and should not be relied upon to fully
            replace existing screening process in systematic reviews (SRs). With
            all Large Language Models (LLMs), this PoC may produce erroneous or
            inaccurate results, and there is a possibility that it may
            "hallucinate" — meaning it could generate content that is factually
            incorrect, misleading, or irrelevant. Therefore, any decisions or
            conclusions drawn from its output should be carefully reviewed and
            verified before being acted upon.
          </p>
          <p className="text-xs">
            Clicking the button below will set a cookie named "disclaimer_read",
            which stores your informed consent for 14 days. The page will be
            refreshed.
          </p>
          <div className="p-2 flex justify-center">
            <button
              className="bg-slate-300 p-2 rounded-md"
              data-testid="accept-terms-and-conditions"
              onClick={() => {
                Cookies.set("disclaimer_read", "true", { expires: 14 });
                navigate("/");
              }}
            >
              Accept terms and conditions
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};
