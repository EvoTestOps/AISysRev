import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import Box from "@mui/material/Box";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import IconButton from "@mui/material/IconButton";
import MuiLink from "@mui/material/Link";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { Link } from "wouter";

export type Crumb = {
  label: React.ReactNode;
  /** Omitted for the current page, the last crumb. */
  href?: string;
  testId?: string;
};

type JobBreadcrumbsProps = {
  crumbs: Crumb[];
  /** Where the back arrow goes: the parent page. */
  backHref: string;
  backLabel: string;
};

/** A back arrow to the parent page, and the path from the project to here. */
export const JobBreadcrumbs: React.FC<JobBreadcrumbsProps> = ({ crumbs, backHref, backLabel }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
    <Tooltip title={backLabel}>
      <IconButton component={Link} href={backHref} aria-label={backLabel} size="small">
        <ArrowBackIcon fontSize="small" />
      </IconButton>
    </Tooltip>
    <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
      {crumbs.map((crumb, i) =>
        crumb.href ? (
          <MuiLink
            key={i}
            component={Link}
            href={crumb.href}
            underline="hover"
            color="inherit"
            data-testid={crumb.testId}
          >
            {crumb.label}
          </MuiLink>
        ) : (
          <Typography
            key={i}
            color="text.primary"
            noWrap
            sx={{ maxWidth: 480 }}
            data-testid={crumb.testId}
          >
            {crumb.label}
          </Typography>
        ),
      )}
    </Breadcrumbs>
  </Box>
);
