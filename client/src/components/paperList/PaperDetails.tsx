type PaperDetailsProps = {
  doi: string | null | undefined;
  abstract: string;
  pdfFileUuid?: string | null;
  pdfFilename?: string | null;
  isGithubScreening: boolean;
  /** Shown between the links and the abstract, e.g. an upload button. */
  actions?: React.ReactNode;
};

const doiHref = (doi: string, isGithubScreening: boolean) => {
  if (!isGithubScreening) {
    return `https://doi.org/${doi}`;
  }
  // A repository's "DOI" is its URL; only link real URLs.
  return /^https?:\/\//i.test(doi) ? doi : undefined;
};

/** A paper's DOI (or repository URL), full-text link and abstract. */
export const PaperDetails: React.FC<PaperDetailsProps> = ({
  doi,
  abstract,
  pdfFileUuid,
  pdfFilename,
  isGithubScreening,
  actions,
}) => (
  <>
    <div className="text-sm pt-2 pb-2">
      {doi && (
        <>
          <strong>{isGithubScreening ? "Repository URL" : "DOI"}:</strong>{" "}
          <a
            href={doiHref(doi, isGithubScreening)}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-600 hover:text-blue-800"
          >
            {doi}
          </a>
        </>
      )}
    </div>
    {pdfFileUuid && pdfFilename && (
      <div className="text-sm pt-2 pb-2">
        <strong>Full text:</strong>{" "}
        <a
          href={`/api/v1/files/${pdfFileUuid}/download`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-blue-600 hover:text-blue-800"
        >
          {pdfFilename}
        </a>
      </div>
    )}
    {actions}
    <div className="text-xs mb-4 bg-slate-200 rounded-md font-mono p-2">{abstract}</div>
  </>
);
