import { useCallback, useState } from "react";
import {
  available_models,
  DecisionType,
  default_model,
  isLeft,
  type Criteria,
  type Model,
} from "../llm/types";
import {
  exampleCriteria,
  exampleTitle,
  exampleAbstract,
} from "../example_data";
import { query_llm } from "../llm/llm";
import { generatePrompt } from "../llm/prompt";
import { FileDropZone } from '../components/FileDrop'

const AUTHORIZATION_TOKEN = "AUTHORIZATION_TOKEN";
const TEMPERATURE = "TEMPERATURE";
const SEED = "SEED";
const AI_MODEL = "AI_MODEL";

const abortController = new AbortController();

function Header() {
  return (
    <div className="flex w-full">
      <div className="w-full lg:w-3/4 lg:mr-auto lg:ml-auto">
        <h1
          className="text-3xl sm:text-4xl md:text-4xl"
          data-testid="app-title"
        >
          AI-automated title-abstract screening PoC
        </h1>
      </div>
    </div>
  );
}

const ErrorPopup: React.FC<{
  error: string;
  setError: (v: string) => void;
}> = ({ error, setError }) => {
  return (
    <div className="bg-opacity-85 bg-black w-full h-full fixed top-0 left-0 z-50 flex items-center justify-center">
      <div className="bg-red-700 text-white p-4 rounded-md shadow-md">
        <h1 className="text-xl font-bold">An error occured</h1>
        <div>{error}</div>
        <div
          className="p-2 mt-3 inline-flex rounded-lg bg-red-950 hover:bg-red-900 font-bold hover:cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            setError("");
          }}
        >
          Close
        </div>
      </div>
    </div>
  );
};

const Subtitle: React.FC<{ title: string; description: string }> = ({
  title,
  description,
}) => (
  <div className="flex flex-row gap-2 items-end">
    <span className="text-3xl font-bold">{title}</span>
    <span className="text-2xl">{description}</span>
  </div>
);

const AppInstructions: React.FC<{ loadExample: () => void }> = ({
  loadExample,
}) => {
  return (
    <div
      className="rounded-lg flex flex-col gap-2 w-full md:w-80"
      data-testid="app-instructions"
    >
      <h2 className="text-2xl font-bold">Introduction</h2>
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
      <h2 className="text-xl font-bold">Supported LLMs</h2>
      <p>
        We support all foundational models listed in the Openrouter website.
      </p>
      <h2 className="text-xl font-bold">License</h2>
      <p>CC-BY-ND 4.0</p>
      <h2 className="text-xl font-bold">Source code</h2>
      <p>Available by request.</p>
      <h2 className="text-xl font-bold">Examples</h2>
      <p>
        <button
          className="bg-slate-900 hover:bg-slate-800 text-white p-2 rounded-lg"
          onClick={(e) => {
            e.preventDefault();
            loadExample();
          }}
        >
          Load example
        </button>
      </p>
    </div>
  );
};

export const ScreeningPage = () => {
  const [error, setError] = useState("");
  const [criterias, setCriterias] = useState<Array<Criteria>>([]);
  const currentId =
    criterias.length === 0 ? 0 : Math.max(...criterias.map((c) => c.id));

  const [selectedModel, setSelectedModel] = useState<Model["id"]>(
    localStorage.getItem(AI_MODEL) || default_model
  );

  const [newCriteria, setNewCriteria] = useState("");

  const [temperature, setTemperature] = useState(
    parseFloat(localStorage.getItem(TEMPERATURE) || "0.0")
  );
  const [seed, setSeed] = useState(
    parseInt(localStorage.getItem(SEED) ?? "128", 10)
  );
  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [authorizationToken, setAuthorizationToken] = useState(
    localStorage.getItem(AUTHORIZATION_TOKEN) || ""
  );

  const [enforceJSON, setEnforceJSON] = useState(false);
  const [decisionType, setDecisionType] =
    useState<DecisionType>("IncludeExclude");
  const [pending, setPending] = useState(false);

  const [response, setResponse] = useState<string | undefined>(undefined);

  const loadExample = useCallback(() => {
    setCriterias(exampleCriteria);
    setTemperature(0);
    setSeed(128);
    setTitle(exampleTitle);
    setAbstract(exampleAbstract);
  }, []);

  const onNewCriteria = useCallback<
    (e: React.FormEvent<HTMLFormElement>) => void
  >(
    (e) => {
      e.preventDefault();
      setCriterias((p) => [
        ...p,
        {
          id: currentId + 1,
          criteria: newCriteria,
        },
      ]);
      setNewCriteria("");
    },
    [currentId, newCriteria]
  );

  const abort = useCallback(() => {
    abortController.abort("Request has been aborted by the user");
    setPending(false);
  }, []);

  const sendRequest = useCallback<
    (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void
  >(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async (_e) => {
      try {
        setPending(true);
        setResponse(undefined);

        const res = await query_llm(
          generatePrompt(criterias, title, abstract, decisionType),
          authorizationToken,
          abortController,
          selectedModel,
          enforceJSON,
          temperature,
          seed,
          decisionType
        );
        if (isLeft(res)) {
          setResponse(res.result.choices[0].message.content);
        } else {
          console.error("Error calling LLM");
          setError(res.error);
          console.error(res);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setPending(false);
      }
    },
    [
      abstract,
      authorizationToken,
      criterias,
      decisionType,
      enforceJSON,
      seed,
      selectedModel,
      temperature,
      title,
    ]
  );

  return (
    <div className="flex flex-col gap-8 w-full h-full">
      {error !== "" && <ErrorPopup error={error} setError={setError} />}
      <Header />
      <div className="pt-2 pb-8 flex w-full md:flex-row flex-col gap-8 lg:w-3/4 lg:mr-auto lg:ml-auto">
        <div>
          <AppInstructions loadExample={loadExample} />
        </div>
        <div className="flex flex-col gap-4 w-full">
          <Subtitle title="Step 1." description="Add file" />
            <div>
              <FileDropZone onFilesDropped={(files) => console.log(files)} />
            </div>
          <Subtitle title="Step 2." description="Define inclusion criteria" />
          <div>
            <form
              onSubmit={onNewCriteria}
              data-testid="inclusion-criteria-form"
            >
              <input
                type="text"
                data-testid="inclusion-criteria-input"
                value={newCriteria}
                onChange={(e) => {
                  e.preventDefault();
                  setNewCriteria(e.target.value);
                }}
                placeholder="Write a single criteria and press [Enter]"
                className="p-2 rounded-lg w-full bg-slate-300"
              />
            </form>
            <ol
              className="ml-6 mt-2 mb-2 list-decimal"
              start={1}
              data-testid="inclusion-criteria-listing"
            >
              {[...criterias]
                .sort((a, b) => a.id - b.id)
                .map((c) => {
                  return (
                    <li
                      className="pl-2 pt-2 pb-2"
                      key={c.id}
                      data-testid={`inclusion-criteria-${c.id}`}
                    >
                      <span
                        className="text-md"
                        data-testid={`inclusion-criteria-${c.id}-text`}
                      >
                        {c.criteria}
                      </span>{" "}
                      <span
                        onClick={(e) => {
                          e.preventDefault();
                          const currentCriteria = [...criterias];
                          const filteredCriterias = currentCriteria.filter(
                            (criteria) => criteria.id !== c.id
                          );
                          setCriterias([...filteredCriterias]);
                        }}
                        role="button"
                        data-testid={`inclusion-criteria-${c.id}-delete`}
                        className="inline-block m-1 text-sm bg-red-800 text-white p-2 rounded-md hover:cursor-pointer"
                      >
                        Delete
                      </span>
                    </li>
                  );
                })}
            </ol>
          </div>
          <Subtitle title="Step 3." description="Add Title and Abstract" />
          <div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
              }}
              className="flex flex-col gap-4"
              data-testid="title-abstract-form"
            >
              <input
                type="text"
                placeholder="Title of the research paper"
                className="p-2 rounded-lg w-full bg-slate-300"
                data-testid="title-input"
                value={title}
                onChange={(e) => {
                  e.preventDefault();
                  setTitle(e.target.value);
                }}
              />
              <textarea
                className="p-2 rounded-lg w-full bg-slate-300"
                placeholder="Abstract"
                data-testid="abstract-input"
                value={abstract}
                onChange={(e) => {
                  e.preventDefault();
                  setAbstract(e.target.value);
                }}
                rows={8}
              />
            </form>
          </div>
          <div className="flex flex-row gap-2 items-end">
            <span className="text-2xl">Decision type</span>
          </div>
          <div className="flex flex-row gap-3">
            <div className="flex flex-row gap-2">
              <input
                id="likert-decision"
                type="radio"
                name="decision-type"
                value="Likert"
                onChange={(e) => {
                  if (e.target.value === "Likert") {
                    setDecisionType("Likert");
                  }
                }}
                checked={decisionType === "Likert"}
              />
              <label htmlFor="likert-decision">Likert-scale (1-7)</label>
            </div>
            <div className="flex flex-row gap-2">
              <input
                id="include-exclude-decision"
                type="radio"
                name="decision-type"
                value="IncludeExclude"
                onChange={(e) => {
                  if (e.target.value === "IncludeExclude") {
                    setDecisionType("IncludeExclude");
                  }
                }}
                checked={decisionType === "IncludeExclude"}
              />
              <label htmlFor="include-exclude-decision">Include-Exclude</label>
            </div>
          </div>
          <div className="flex flex-row gap-2 items-end">
            <span className="text-2xl">LLM configuration</span>
          </div>
          <div className="text-lg grid grid-cols-2 gap-2 items-center">
            <span className="font-bold">
              <a
                href="https://openrouter.ai"
                target="__blank"
                className="hover:underline text-blue-700"
              >
                Openrouter
              </a>{" "}
              API key
            </span>
            <div className="flex flex-row gap-2">
              <input
                type="password"
                data-testid="api-key-input"
                value={authorizationToken}
                onChange={(e) => {
                  e.preventDefault();
                  localStorage.setItem(AUTHORIZATION_TOKEN, e.target.value);
                  setAuthorizationToken(e.target.value);
                }}
                className="p-2 rounded-md w-full bg-slate-300"
              />
              {authorizationToken !== "" && (
                <button
                  className="p-2 bg-red-800 hover:bg-red-700 w-16 text-white rounded-md"
                  data-testid="api-key-clear"
                  onClick={(e) => {
                    e.preventDefault();
                    setAuthorizationToken("");
                    localStorage.removeItem(AUTHORIZATION_TOKEN);
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <div>
            <div className="text-lg grid grid-cols-2 gap-2 items-center">
              <span className="font-bold">Model</span>
              {Object.values(available_models).length > 0 && (
                <select
                  name="model"
                  className="p-4 rounded-md bg-slate-300"
                  data-testid="models-select"
                  disabled={authorizationToken === ""}
                  defaultValue={selectedModel}
                  onChange={(e) => {
                    e.preventDefault();
                    setSelectedModel(e.target.value);
                    localStorage.setItem(AI_MODEL, e.target.value);
                  }}
                >
                  {Object.values(available_models).map((m) => (
                    <option key={m} value={m} data-testid={`model-option-${m}`}>
                      {m} {m === default_model && <>(default)</>}
                    </option>
                  ))}
                </select>
              )}
              <span className="font-bold">Temperature ({temperature})</span>
              <input
                type="range"
                className="pt-2 pb-2 disabled:cursor-not-allowed bg-slate-300"
                data-testid="temperature-input"
                disabled={authorizationToken === ""}
                min={0}
                max={1}
                step={0.1}
                value={temperature}
                onChange={(e) => {
                  e.preventDefault();
                  setTemperature(e.target.valueAsNumber);
                  localStorage.setItem(TEMPERATURE, e.target.value);
                }}
              />
              <span className="font-bold">Seed</span>
              <input
                type="number"
                disabled={authorizationToken === ""}
                className="p-2 rounded-md disabled:cursor-not-allowed bg-slate-300"
                data-testid="seed-input"
                value={seed}
                onChange={(e) => {
                  e.preventDefault();
                  setSeed(e.target.valueAsNumber);
                  localStorage.setItem(SEED, e.target.value);
                }}
              />
              <span className="font-bold">Enforce JSON output</span>
              <input
                type="checkbox"
                disabled={authorizationToken === ""}
                className="p-2 rounded-md disabled:cursor-not-allowed"
                data-testid="enforce-json-input"
                checked={enforceJSON}
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                onChange={(_e) => {
                  setEnforceJSON(!enforceJSON);
                }}
              />
            </div>
          </div>
          <div className="flex items-center justify-center">
            {!pending && (
              <button
                data-testid="send-request-button"
                disabled={
                  criterias.length === 0 ||
                  title === "" ||
                  abstract === "" ||
                  authorizationToken === ""
                }
                className="p-4 disabled:opacity-20 disabled:cursor-not-allowed bg-green-600 hover:bg-green-500 text-white rounded-lg text-lg font-bold w-full md:w-1/2"
                onClick={sendRequest}
              >
                Send request
              </button>
            )}
            {pending && (
              <button
                data-testid="abort-request-button"
                className="p-4 disabled:opacity-20 disabled:cursor-not-allowed bg-red-600 hover:bg-red-500 text-white rounded-lg text-lg font-bold w-full md:w-1/2"
                onClick={(e) => {
                  e.preventDefault();
                  abort();
                }}
              >
                Abort request
              </button>
            )}
          </div>
          {response !== undefined && (
            <div className="flex flex-row gap-4 items-end">
              <span className="text-4xl">Response</span>
            </div>
          )}
          <div>
            {!pending && response !== undefined && (
              <pre
                className="bg-slate-700 p-4 rounded-lg w-full text-wrap"
                data-testid="response"
              >
                {response}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
