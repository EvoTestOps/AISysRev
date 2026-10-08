import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import Box from "@mui/material/Box";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import MuiLink from "@mui/material/Link";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import { Link } from "wouter";

export type PageParent = { label: string; href: string };

/** The parent of every page inside a project. */
export const PROJECTS_PARENT: PageParent = { label: "Projects", href: "/" };

type PageHeaderProps = {
  title: string;
  /** The page one level up, shown before the title, e.g. "Projects › My project". */
  parent?: PageParent;
  /** Page-level actions, aligned to the right of the title. */
  actions?: React.ReactNode;
  /** Shows a placeholder for the title while it is loading, e.g. a project's name. */
  loading?: boolean;
};

const TitleSkeleton = () => <Skeleton width={240} sx={{ maxWidth: "50vw" }} />;

/** The page title and its actions, above the page content. */
export const PageHeader: React.FC<PageHeaderProps> = ({ title, parent, actions, loading }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 2,
      flexWrap: "wrap",
      mb: 3,
    }}
  >
    {parent ? (
      <Breadcrumbs
        component="h1"
        aria-label="breadcrumb"
        separator={<NavigateNextIcon />}
        sx={{ m: 0, minWidth: 0, typography: "h5", "& .MuiBreadcrumbs-ol": { flexWrap: "nowrap" } }}
      >
        <MuiLink
          component={Link}
          href={parent.href}
          underline="hover"
          color="text.secondary"
          variant="h5"
          sx={{ whiteSpace: "nowrap" }}
        >
          {parent.label}
        </MuiLink>
        <Typography
          variant="h5"
          component="span"
          noWrap
          sx={{ fontWeight: 600, color: "text.primary" }}
          aria-current="page"
        >
          {loading ? <TitleSkeleton /> : title}
        </Typography>
      </Breadcrumbs>
    ) : (
      <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
        {loading ? <TitleSkeleton /> : title}
      </Typography>
    )}
    {actions && <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>{actions}</Box>}
  </Box>
);
