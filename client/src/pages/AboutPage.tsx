import { Layout } from "../components/Layout";
import { H3 } from "../components/Typography";

export const AboutPage = () => (
  <Layout title="About">
    <div className="flex flex-col gap-4 px-4 py-8 sm:px-8 md:px-16 lg:px-24 lg:py-12 xl:px-28 xl:py-12">
      <H3>Introduction</H3>
      <p>
        This proof-of-concept (PoC) demonstrates the capabilities of
        AI-automated title-abstract screening of systematic reviews (SRs), which
        is subject to further research and improvements. This PoC is based on a
        conference paper{" "}
        <a
          href="https://doi.org/10.1145/3661167.3661172"
          target="_blank"
          className="text-blue-700 hover:underline"
        >
          "The Promise and Challenges of Using LLMs to Accelerate the Screening
          Process of Systematic Reviews"
        </a>{" "}
        by Huotala et al.
      </p>
      <H3>Supported LLMs</H3>
      <p>
        We support all foundational models listed in the Openrouter website.
      </p>
      <H3>License</H3>
      <p>CC-BY-ND 4.0</p>
      <H3>Source code</H3>
      <p>Available by request.</p>
    </div>
  </Layout>
);
