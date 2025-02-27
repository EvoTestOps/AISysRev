import Cookies from "js-cookie";

export const TermsAndConditions: React.FC = () => {
  return (
    <div className="bg-gray-800 text-neutral-200 flex flex-col items-start gap-8 justify-start w-[100vw] h-[100vh]">
      <div className="p-2 flex flex-col gap-4 w-full md:w-3/4 xl:w-1/2 2xl:w-1/3 md:mr-auto md:ml-auto">
        <h1
          className="text-3xl sm:text-4xl md:text-4xl"
          data-testid="app-title"
        >
          AI-automated title-abstract screening PoC
        </h1>
        <div className="flex flex-col gap-2" data-testid="app-instructions">
          <h2 className="text-2xl font-bold">Terms and conditions</h2>
          <p className="mb-2 mt-2">
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
          <div className="flex flex-col">
            <button
              className="bg-slate-900 p-3 rounded-md"
              data-testid="accept-terms-and-conditions"
              onClick={() => {
                Cookies.set("disclaimer_read", "true", {
                  expires: 14,
                });
                window.location.reload();
              }}
            >
              Accept terms and conditions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
