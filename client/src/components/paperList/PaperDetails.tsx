import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { itemHref } from "../../helpers/screeningTarget";
import { ScreeningTarget } from "../../state/types";

type PaperDetailsProps = {
  doi: string | null | undefined;
  abstract: string;
  pdfFileUuid?: string | null;
  pdfFilename?: string | null;
  screeningTarget: ScreeningTarget;
  /** Shown next to the links, e.g. an upload button. */
  actions?: React.ReactNode;
};

const LABELS: Record<ScreeningTarget, { identifier: string; abstract: string }> = {
  [ScreeningTarget.PAPER]: { identifier: "DOI", abstract: "Abstract" },
  [ScreeningTarget.GITHUB_REPOSITORY]: { identifier: "Repository", abstract: "Description" },
};

/** A paper's DOI (or repository URL), full-text link and abstract. */
export const PaperDetails: React.FC<PaperDetailsProps> = ({
  doi,
  abstract,
  pdfFileUuid,
  pdfFilename,
  screeningTarget,
  actions,
}) => {
  const hasFullText = Boolean(pdfFileUuid && pdfFilename);
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {(doi || hasFullText || actions) && (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.5,
          }}
        >
          <Box
            component="dl"
            sx={{
              display: "grid",
              gridTemplateColumns: "auto minmax(0, 1fr)",
              columnGap: 1.5,
              rowGap: 0.5,
              m: 0,
              minWidth: 0,
              typography: "body2",
              "& dt": { color: "text.secondary" },
              "& dd": { m: 0, overflowWrap: "anywhere" },
            }}
          >
            {doi && (
              <>
                <dt>{LABELS[screeningTarget].identifier}</dt>
                <dd>
                  <Link
                    href={itemHref(doi, screeningTarget)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {doi}
                  </Link>
                </dd>
              </>
            )}
            {hasFullText && (
              <>
                <dt>Full text</dt>
                <dd>
                  <Link
                    href={`/api/v1/files/${pdfFileUuid}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {pdfFilename}
                  </Link>
                </dd>
              </>
            )}
          </Box>
          {actions}
        </Box>
      )}
      <Box component="section">
        <Typography
          variant="overline"
          component="h4"
          sx={{ display: "block", color: "text.secondary", lineHeight: 2 }}
        >
          {LABELS[screeningTarget].abstract}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            lineHeight: 1.7,
            whiteSpace: "pre-line",
            maxWidth: "80ch",
            color: abstract ? "text.primary" : "text.disabled",
          }}
        >
          {abstract || "No abstract."}
        </Typography>
      </Box>
    </Box>
  );
};
