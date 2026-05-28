import { Layout } from "../components/Layout";

export const DisclaimerPage = () => {
  return (
    <Layout title="Disclaimer">
      <div className="p-2 flex flex-col gap-4 w-full md:w-3/4 xl:w-2/3 2xl:w-2/3 md:mr-auto md:ml-auto">
        <div className="flex flex-col gap-2">
          <p className="mb-4">
            By using the AISysRev tool, you acknowledge and agree that it is
            intended for testing purposes only. This tool should not be
            considered a final solution and should not be relied upon to fully
            replace existing screening processes in systematic reviews (SRs). With
            all Large Language Models (LLMs), this AI tool may produce erroneous
            or inaccurate results, and there is a possibility that it may
            "hallucinate" — meaning it could generate content that is factually
            incorrect, misleading, or irrelevant. Therefore, any decisions or
            conclusions drawn from its output should be carefully reviewed and
            verified before being acted upon.
          </p>
        </div>
      </div>
    </Layout>
  );
};
