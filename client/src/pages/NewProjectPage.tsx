import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { toast } from "react-toastify";
import { H6 } from "../components/Typography";
import { Layout } from "../components/Layout";
import { CriteriaInput } from "../components/CriteriaInput";
import { CriteriaList } from "../components/CriteriaList";
import { ExpandableToast } from "../components/ExpandableToast";
import { RotateCcw } from "lucide-react";
import { Criteria } from "../state/types";
import { create_project } from "../services/projectService";
import { Card } from "../components/Card";
import { useTypedStoreActions } from "../state/store";
import { Button } from "../components/Button";

export const NewProject = () => {
  const [title, setTitle] = useState("");
  const [inclusionCriteriaInput, setInclusionCriteriaInput] = useState("");
  const [exclusionCriteriaInput, setExclusionCriteriaInput] = useState("");
  const [inclusionCriteria, setInclusionCriteria] = useState<string[]>([]);
  const [exclusionCriteria, setExclusionCriteria] = useState<string[]>([]);

  const [, navigate] = useLocation();

  const handleInclusionSetup = useCallback(() => {
    if (inclusionCriteriaInput.trim() !== "") {
      setInclusionCriteria([...inclusionCriteria, inclusionCriteriaInput]);
      setInclusionCriteriaInput("");
    }
  }, [inclusionCriteria, inclusionCriteriaInput]);

  const handleExclusionSetup = useCallback(() => {
    if (exclusionCriteriaInput.trim() !== "") {
      setExclusionCriteria([...exclusionCriteria, exclusionCriteriaInput]);
      setExclusionCriteriaInput("");
    }
  }, [exclusionCriteria, exclusionCriteriaInput]);

  const deleteInclusionCriteria = useCallback((index: number) => {
    setInclusionCriteria((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const deleteExclusionCriteria = useCallback((index: number) => {
    setExclusionCriteria((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const refreshProjects = useTypedStoreActions(
    (actions) => actions.refreshProjects
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
      };

      try {
        const res = await create_project(title, criteria);
        console.log("Project created, res: ", res);
        return { id: res.id, uuid: res.uuid };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        if (error.response?.data?.detail?.errors) {
          throw new Error(JSON.stringify(error.response.data.detail.errors));
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
          refreshProjects();
          navigate(`/project/${uuid}`);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        try {
          const msg = typeof error?.message === "string" ? error.message : "";
          const parsed = JSON.parse(msg);

          if (Array.isArray(parsed)) {
            ExpandableToast(parsed);
          } else {
            toast.error("Project creation failed (non-array error).");
          }
        } catch (parseError) {
          console.error("JSON parsing failed:", parseError);
          toast.error(
            `Project creation failed: ${error.message || "Unknown error"}`
          );
        }
      }
    }
  }, [title, inclusionCriteria, exclusionCriteria, refreshProjects, navigate]);

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
        <Card>
          <div className="flex justify-between items-end gap-4">
            <Button
              variant="red"
              onClick={() => {
                setTitle("");
                setInclusionCriteria([]);
                setExclusionCriteria([]);
                setInclusionCriteriaInput("");
                setExclusionCriteriaInput("");
              }}
            >
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
