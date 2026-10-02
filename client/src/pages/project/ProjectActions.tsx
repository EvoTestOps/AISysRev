import { BarChart2, Download, FileText } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { Button } from "../../components/Button";
import { ScreeningTarget } from "../../state/types";

type ProjectActionsProps = {
  hasPapers: boolean;
  projectUuid: string;
  downloadCsv: () => unknown;
  downloadMissingFulltextRis: () => unknown;
  onImportFulltext: () => unknown;
  importingFulltext: boolean;
  onPerCriteriaStats: () => void;
  hasMultiplePcJobs: boolean;
  screeningTarget: ScreeningTarget;
};

export const ProjectActions: React.FC<ProjectActionsProps> = ({
  hasPapers,
  projectUuid,
  downloadCsv,
  downloadMissingFulltextRis,
  onImportFulltext,
  importingFulltext,
  onPerCriteriaStats,
  hasMultiplePcJobs,
  screeningTarget,
}) => {
  const isGithubScreening = screeningTarget === ScreeningTarget.GITHUB_REPOSITORY;
  return (
    <div className="flex flex-row gap-2">
      {hasMultiplePcJobs && (
        <Button
          variant="slate"
          onClick={onPerCriteriaStats}
          title="Per-criteria agreement statistics"
        >
          <BarChart2 />
          <span>PC Agreement Stats</span>
        </Button>
      )}
      {!isGithubScreening && (
        <Button
          variant="slate"
          onClick={downloadMissingFulltextRis}
          title="Download papers missing full text"
          disabled={!hasPapers}
        >
          <Download />
          <span>Download papers missing full text</span>
        </Button>
      )}
      {!isGithubScreening && (
        <Button
          variant="slate"
          onClick={onImportFulltext}
          title="Import full text (Zotero Export Folder)"
          data-testid="import-fulltext-button"
          disabled={!hasPapers || importingFulltext}
        >
          <Download />
          <span>
            {importingFulltext ? "Importing..." : "Import full text (Zotero Export Folder)"}
          </span>
        </Button>
      )}
      <Button variant="slate" onClick={downloadCsv} title="Download CSV" disabled={!hasPapers}>
        <Download />
        <span>Download CSV</span>
      </Button>
      {hasPapers && (
        <a
          className={twMerge(
            "px-4 py-2 text-white flex flex-row gap-2 items-center content-center text-sm font-semibold rounded-lg shadow-md transition duration-200 ease-in-out cursor-pointer bg-slate-800 hover:bg-slate-700",
          )}
          href={`/api/v1/result/html?${new URLSearchParams({
            project_uuid: projectUuid,
            screening_target: screeningTarget,
          }).toString()}`}
          target="__blank"
          rel="noopener noreferrer"
          title="Show HTML"
        >
          <FileText />
          <span>Show HTML</span>
        </a>
      )}
    </div>
  );
};
