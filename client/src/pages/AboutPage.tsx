import { Layout } from "../components/Layout";
import { H1, H3 } from "../components/Typography";

export const AboutPage = () => (
  <Layout title="About AISysRev">
    <div className="flex flex-col gap-4 rounded-lg bg-white p-6 shadow-lg">
      <H1>AISysRev</H1>
      <p>
        <strong>AISysRev</strong> demonstrates the capabilities of AI-automated
        title-abstract screening of systematic reviews (SRs), which is subject
        to further research and improvements. This PoC is based on the following
        scientific contributions:
        <ul className="list-disc ml-4">
          <li>
            <strong>
              Huotala, A., Kuutila, M., & Mäntylä, M. (2025). SESR-Eval: Dataset
              for Evaluating LLMs in the Title-Abstract Screening of Systematic
              Reviews
            </strong>
            .{" "}
            <i>
              ESEM '25: Proceedings of the 19th ACM/IEEE International Symposium
              on Empirical Software Engineering and Measurement
            </i>
            .{" "}
            <a
              href="https://doi.org/10.48550/arXiv.2507.19027"
              target="__blank"
              className="text-blue-700"
            >
              https://doi.org/10.48550/arXiv.2507.19027
            </a>
          </li>
          <li>
            <strong>
              Huotala, A., Kuutila, M., Ralph, P., & Mäntylä, M. (2024). The
              promise and challenges of using llms to accelerate the screening
              process of systematic reviews
            </strong>
            .{" "}
            <i>
              Proceedings of the 28th International Conference on Evaluation and
              Assessment in Software Engineering
            </i>
            , 262–271.{" "}
            <a
              href="https://doi.org/10.1145/3661167.3661172"
              target="__blank"
              className="text-blue-700"
            >
              https://doi.org/10.1145/3661167.3661172
            </a>
          </li>
        </ul>
      </p>
      <H3>Supported LLMs</H3>
      <p>
        We support all LLMs hosted by Openrouter,{" "}
        <strong>
          that support structured JSON response, along with configuring
          temperature, seed and top_p parameters.
        </strong>
      </p>
      <H3>License</H3>
      <p>CC-BY-ND 4.0</p>
      <H3>Source code</H3>
      <p>Available by request.</p>
      <H3>Contributors</H3>
      <p>
        See the{" "}
        <a
          href="https://github.com/EvoTestOps"
          target="__blank"
          className="text-blue-700"
        >
          EvoTestOps
        </a>{" "}
        GitHub homepage.
      </p>
      <H3>Funding</H3>
      <p>
        This research has been funded by the Strategic Research Council of
        Research Council of Finland (Grant ID 358471)
      </p>
    </div>
  </Layout>
);
