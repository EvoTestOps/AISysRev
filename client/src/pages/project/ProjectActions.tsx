import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import DriveFolderUploadOutlinedIcon from "@mui/icons-material/DriveFolderUploadOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import { useState } from "react";
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

const useMenu = () => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return {
    anchor,
    open: (e: React.MouseEvent<HTMLElement>) => setAnchor(e.currentTarget),
    close: () => setAnchor(null),
  };
};

/**
 * The project's page actions: exports in one menu, everything else in an
 * overflow menu, so new actions don't widen the header.
 */
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
  // Only papers have full texts to export or import.
  const hasFullTexts = screeningTarget === ScreeningTarget.PAPER;
  const exportMenu = useMenu();
  const moreMenu = useMenu();
  const run = (close: () => void, action: () => unknown) => () => {
    close();
    action();
  };
  const htmlReportHref = `/api/v1/result/html?${new URLSearchParams({
    project_uuid: projectUuid,
    screening_target: screeningTarget,
  }).toString()}`;

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<DownloadOutlinedIcon />}
        endIcon={<ArrowDropDownIcon />}
        disabled={!hasPapers}
        onClick={exportMenu.open}
        data-testid="project-export-button"
      >
        Export
      </Button>
      <Menu
        anchorEl={exportMenu.anchor}
        open={exportMenu.anchor !== null}
        onClose={exportMenu.close}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem onClick={run(exportMenu.close, downloadCsv)}>
          <ListItemIcon>
            <DescriptionOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Download results (CSV)</ListItemText>
        </MenuItem>
        <MenuItem
          component="a"
          href={htmlReportHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={exportMenu.close}
        >
          <ListItemIcon>
            <OpenInNewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Open HTML report</ListItemText>
        </MenuItem>
        {hasFullTexts && (
          <MenuItem onClick={run(exportMenu.close, downloadMissingFulltextRis)}>
            <ListItemIcon>
              <DownloadOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Papers missing full text (RIS)</ListItemText>
          </MenuItem>
        )}
      </Menu>

      <Tooltip title="More actions">
        <IconButton
          aria-label="More actions"
          onClick={moreMenu.open}
          data-testid="project-more-actions-button"
        >
          <MoreVertIcon />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={moreMenu.anchor}
        open={moreMenu.anchor !== null}
        onClose={moreMenu.close}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {hasFullTexts && (
          <MenuItem
            disabled={!hasPapers || importingFulltext}
            onClick={run(moreMenu.close, onImportFulltext)}
            data-testid="import-fulltext-button"
          >
            <ListItemIcon>
              <DriveFolderUploadOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={importingFulltext ? "Importing full text…" : "Import full text"}
              secondary="From a Zotero export folder"
            />
          </MenuItem>
        )}
        <MenuItem disabled={!hasMultiplePcJobs} onClick={run(moreMenu.close, onPerCriteriaStats)}>
          <ListItemIcon>
            <BarChartOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Per-criteria agreement"
            secondary={hasMultiplePcJobs ? undefined : "Needs two per-criteria tasks"}
          />
        </MenuItem>
      </Menu>
    </>
  );
};
