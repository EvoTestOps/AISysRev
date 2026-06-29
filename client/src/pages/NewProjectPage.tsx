import { useState, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "react-toastify";
import { H6 } from "../components/Typography";
import { Layout } from "../components/Layout";
import { CriteriaInput } from "../components/CriteriaInput";
import { CriteriaList } from "../components/CriteriaList";
import { ExpandableToast } from "../components/ExpandableToast";
import { RotateCcw } from "lucide-react";
import { create_project } from "../services/projectService";
import { Card } from "../components/Card";
import { useTypedStoreActions } from "../state/store";
import { Button } from "../components/Button";
import type { Criteria } from "../state/types/project";
import { ScreeningTarget } from "../state/types";

export const NewProject = () => {
  const [title, setTitle] = useState("");
  const [inclusionCriteriaInput, setInclusionCriteriaInput] = useState("");
  const [exclusionCriteriaInput, setExclusionCriteriaInput] = useState("");
  const [inclusionCriteria, setInclusionCriteria] = useState<string[]>([]);
  const [exclusionCriteria, setExclusionCriteria] = useState<string[]>([]);
  const [inclusionExpression, setInclusionExpression] = useState("");
  const [exclusionExpression, setExclusionExpression] = useState("");

  const [, navigate] = useLocation();

  const handleInclusionSetup = useCallback(() => {
    if (inclusionCriteriaInput.trim() !== "") {
      setInclusionCriteria((prev) => [...prev, inclusionCriteriaInput]);
      setInclusionCriteriaInput("");
    }
  }, [inclusionCriteriaInput]);

  const handleExclusionSetup = useCallback(() => {
    if (exclusionCriteriaInput.trim() !== "") {
      setExclusionCriteria((prev) => [...prev, exclusionCriteriaInput]);
      setExclusionCriteriaInput("");
    }
  }, [exclusionCriteriaInput]);

  const deleteInclusionCriteria = useCallback((index: number) => {
    setInclusionCriteria((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const deleteExclusionCriteria = useCallback((index: number) => {
    setExclusionCriteria((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const refreshProjects = useTypedStoreActions(
    (actions) => actions.refreshProjects,
  );

  const criteriaIdMap = useMemo(() => {
    const map: Record<string, string> = {};
    inclusionCriteria.forEach((desc, i) => { map[`IC${i + 1}`] = desc; });
    return map;
  }, [inclusionCriteria]);

  const exclusionCriteriaIdMap = useMemo(() => {
    const map: Record<string, string> = {};
    exclusionCriteria.forEach((desc, i) => { map[`EC${i + 1}`] = desc; });
    return map;
  }, [exclusionCriteria]);

  const [screeningTarget, setScreeningTarget] = useState<ScreeningTarget>(
    ScreeningTarget.PAPER,
  );

  const handleCreate = useCallback(async () => {
    if (title.trim() === "") {
      toast.error("Title is required");
    } else {
      handle().catch(console.error);
    }

    async function create(): Promise<{ id: number; uuid: string }> {
      const criteria: Criteria = {
        inclusion_criteria: inclusionCriteria,
        exclusion_criteria: exclusionCriteria,
        ...(inclusionExpression.trim()
          ? { inclusion_expression: inclusionExpression.trim() }
          : {}),
        ...(exclusionExpression.trim()
          ? { exclusion_expression: exclusionExpression.trim() }
          : {}),
      };

      try {
        const res = await create_project(title, criteria);
        return { id: res.id, uuid: res.uuid };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        if (error.response?.data?.detail?.errors) {
          throw new Error(JSON.stringify(error.response.data.detail.errors));
        }
        if (Array.isArray(error.response?.data?.detail)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const msg = (error.response.data.detail as any[])
            .map((e) => e.msg as string)
            .join("\n");
          throw new Error(msg);
        }
        throw error;
      }
    }

    async function handle() {
      let uuid: string | null = null;
      try {
        const res = await create();
        uuid = res.uuid;
        toast.success("Project created successfully!");
        if (uuid) {
          window.localStorage.setItem(
            `aisysrev:screeningTarget:${uuid}`,
            screeningTarget,
          );
          refreshProjects();
          navigate(`/project/${uuid}`);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        const msg = typeof error?.message === "string" ? error.message : "";
        try {
          const parsed = JSON.parse(msg);
          if (Array.isArray(parsed)) {
            ExpandableToast(parsed);
          } else {
            toast.error("Project creation failed.");
          }
        } catch {
          toast.error(msg || "Project creation failed.");
        }
      }
    }
  }, [title, inclusionCriteria, exclusionCriteria, inclusionExpression, exclusionExpression, refreshProjects, navigate, screeningTarget]);

  const handleReset = useCallback(() => {
    setTitle("");
    setInclusionCriteria([]);
    setExclusionCriteria([]);
    setInclusionCriteriaInput("");
    setExclusionCriteriaInput("");
    setInclusionExpression("");
    setExclusionExpression("");
    setScreeningTarget(ScreeningTarget.PAPER);
  }, []);

  return (
    <Layout title="New Project">
      <div className="flex flex-col gap-2">
        <Card>
          <div className="grid grid-cols-[200px_1fr] items-center gap-4">
            <H6>
              Title<span className="text-red-500 font-semibold">*</span>
            </H6>
            <input
              type="text"
              className="border border-gray-300 pr-4 pl-4 h-10 rounded-lg shadow-md w-full focus:outline-none"
              placeholder="Enter project title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
        </Card>
        <Card>
          <div className="grid grid-cols-[200px_1fr] items-center gap-4 mb-8">
            <div className="flex justify-start h-full">
              <H6>
                Inclusion criteria
                <span className="text-red-500 font-semibold">*</span>
              </H6>
            </div>
            <div className="flex flex-col gap-4">
              <CriteriaList
                criteria={inclusionCriteria}
                onDelete={deleteInclusionCriteria}
              />
              <CriteriaInput
                placeholder="Inclusion criterion + [Enter]"
                value={inclusionCriteriaInput}
                setCriteriaInput={setInclusionCriteriaInput}
                handleSetup={handleInclusionSetup}
              />
            </div>
          </div>
          <div className="grid grid-cols-[200px_1fr] items-center gap-4">
            <div className="flex justify-start h-full">
              <H6>
                Exclusion criteria
                <span className="text-red-500 font-semibold">*</span>
              </H6>
            </div>
            <div className="flex flex-col gap-4">
              <CriteriaList
                criteria={exclusionCriteria}
                onDelete={deleteExclusionCriteria}
              />
              <CriteriaInput
                placeholder="Exclusion criterion + [Enter]"
                value={exclusionCriteriaInput}
                setCriteriaInput={setExclusionCriteriaInput}
                handleSetup={handleExclusionSetup}
              />
            </div>
          </div>
        </Card>
        <label className="flex items-start gap-3 border border-gray-200 p-3 text-sm mb-3">
              <input
                type="checkbox"
                checked={screeningTarget === ScreeningTarget.GITHUB_REPOSITORY}
                onChange={(event) =>
                  setScreeningTarget(
                    event.target.checked
                      ? ScreeningTarget.GITHUB_REPOSITORY
                      : ScreeningTarget.PAPER,
                  )
                }
              />
              <span className="font-semibold">GitHub repository screening</span>
          </label>
        <Card>
          <div className="flex flex-col gap-4">
            <div>
              <H6>Per-criteria logic <span className="font-normal text-gray-400">(optional)</span></H6>
              <p className="text-sm text-gray-500 mt-1">
                Define custom boolean logic for per-criteria screening. Use AND, OR, and NOT — NOT flips a single criterion (e.g. <span className="font-mono">NOT IC1</span>). Use parentheses to group AND/OR sub-expressions. Leave blank to default to OR.
              </p>
            </div>
            <div className="grid grid-cols-[200px_1fr] items-start gap-4">
              <H6 className="mt-2">Inclusion logic</H6>
              <div className="flex flex-col gap-1">
                {Object.keys(criteriaIdMap).length > 0 && (
                  <div className="text-xs text-gray-400 flex flex-wrap gap-x-4 gap-y-1 mb-1">
                    {Object.entries(criteriaIdMap).map(([id, desc]) => (
                      <span key={id}>
                        <span className="font-mono font-semibold text-gray-600">{id}</span>
                        {" = "}
                        <span className="italic">{desc.length > 50 ? desc.slice(0, 50) + "…" : desc}</span>
                      </span>
                    ))}
                  </div>
                )}
                <input
                  type="text"
                  className="border border-gray-300 pr-4 pl-4 h-10 rounded-lg shadow-md w-full focus:outline-none font-mono"
                  placeholder="e.g. IC1 AND IC2"
                  value={inclusionExpression}
                  onChange={(e) => setInclusionExpression(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-[200px_1fr] items-start gap-4">
              <H6 className="mt-2">Exclusion logic</H6>
              <div className="flex flex-col gap-1">
                {Object.keys(exclusionCriteriaIdMap).length > 0 && (
                  <div className="text-xs text-gray-400 flex flex-wrap gap-x-4 gap-y-1 mb-1">
                    {Object.entries(exclusionCriteriaIdMap).map(([id, desc]) => (
                      <span key={id}>
                        <span className="font-mono font-semibold text-gray-600">{id}</span>
                        {" = "}
                        <span className="italic">{desc.length > 50 ? desc.slice(0, 50) + "…" : desc}</span>
                      </span>
                    ))}
                  </div>
                )}
                <input
                  type="text"
                  className="border border-gray-300 pr-4 pl-4 h-10 rounded-lg shadow-md w-full focus:outline-none font-mono"
                  placeholder="e.g. EC1 OR EC2"
                  value={exclusionExpression}
                  onChange={(e) => setExclusionExpression(e.target.value)}
                />
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex justify-between items-end gap-4">
            <Button variant="red" onClick={handleReset}>
              <RotateCcw size={16} />
              <span>Reset</span>
            </Button>
            <Button onClick={handleCreate}>
              <span>Create</span>
            </Button>
          </div>
        </Card>
      </div>
    </Layout>
  );
};
