import { useCallback, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import { useLocation, useRoute, useSearch } from "wouter";
import { PaperReadWithAvgProbability } from "../../../services/api/client";
import { JobWithStats } from "../../../state/types";

/**
 * Stepping through papers in the manual evaluation modal, which is open on
 * /project/:projectUuid/evaluate?paperUuid=...
 */
export const useManualEvaluation = ({
  projectUuid,
  papers,
  jobs,
  itemNamePlural,
}: {
  projectUuid: string;
  papers: PaperReadWithAvgProbability[];
  jobs: JobWithStats[];
  itemNamePlural: string;
}) => {
  const [, navigate] = useLocation();
  const [isOpen] = useRoute("/project/:projectUuid/evaluate");
  const search = useSearch();

  const paperUuid = useMemo(() => {
    if (!search) return null;
    return new URLSearchParams(search).get("paperUuid");
  }, [search]);

  const pendingTasks = useMemo(
    () => papers.filter((paper) => paper.human_result == null),
    [papers],
  );

  const evaluationFinished = papers.length > 0 && jobs.length === 0 && pendingTasks.length === 0;

  const paperToTaskMap = useMemo(() => {
    if (papers.length === 0 || jobs.length === 0 || pendingTasks.length === 0) {
      return {};
    }

    const byDoi: Record<string, string> = {};
    pendingTasks.forEach((task) => {
      if (task.doi && !byDoi[task.doi]) {
        byDoi[task.doi] = task.uuid;
      }
    });

    const map: Record<string, string> = {};
    papers.forEach((paper, idx) => {
      if (paper.doi && byDoi[paper.doi]) {
        map[paper.uuid] = byDoi[paper.doi];
      } else if (pendingTasks[idx]) {
        map[paper.uuid] = pendingTasks[idx].uuid;
      }
    });
    return map;
  }, [papers, jobs, pendingTasks]);

  const evaluatePaper = useCallback(
    (uuid: string, options?: { replace: boolean }) =>
      navigate(`/project/${projectUuid}/evaluate?paperUuid=${uuid}`, options),
    [navigate, projectUuid],
  );

  const open = useCallback(() => {
    if (evaluationFinished) return;
    if (papers.length === 0) {
      toast.warn(`No ${itemNamePlural} available.`);
      return;
    }
    const target = papers.find((paper) => paperToTaskMap[paper.uuid]) || papers[0];
    evaluatePaper(target.uuid);
  }, [evaluationFinished, papers, itemNamePlural, paperToTaskMap, evaluatePaper]);

  const next = useCallback(async () => {
    if (!paperUuid) return;
    const idx = papers.findIndex((paper) => paper.uuid === paperUuid);
    if (idx !== -1) {
      for (let i = idx + 1; i < papers.length; i++) {
        const candidate = papers[i];
        if (jobs.length === 0 || paperToTaskMap[candidate.uuid]) {
          evaluatePaper(candidate.uuid);
          return;
        }
      }
    }
    navigate(`/project/${projectUuid}`);
    toast.success("Manual evaluation finished.");
  }, [paperUuid, papers, jobs.length, paperToTaskMap, evaluatePaper, navigate, projectUuid]);

  // Opening /evaluate without a paper starts from the first one.
  useEffect(() => {
    if (isOpen && !paperUuid && papers.length > 0) {
      const first = papers.find((paper) => paperToTaskMap[paper.uuid]) || papers[0];
      evaluatePaper(first.uuid, { replace: true });
    }
  }, [isOpen, paperUuid, papers, paperToTaskMap, evaluatePaper]);

  return {
    isOpen,
    paperUuid,
    currentTaskUuid: paperUuid ? paperToTaskMap[paperUuid] : undefined,
    evaluationFinished,
    canStart: papers.length > 0,
    open,
    next,
    close: () => navigate(`/project/${projectUuid}`),
  };
};
