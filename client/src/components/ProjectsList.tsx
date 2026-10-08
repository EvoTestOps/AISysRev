import AddIcon from "@mui/icons-material/Add";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import GitHubIcon from "@mui/icons-material/GitHub";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { Fragment, useMemo, useState } from "react";
import { Link } from "wouter";
import { useTypedStoreState } from "../state/store";
import { ScreeningTarget } from "../state/types";
import type { Project } from "../state/types/project";
import { ConfirmationModal } from "./ConfirmationModal";
import { FadeIn } from "./FadeIn";
import { riseIn } from "./motion";
import { SkeletonGroup } from "./skeletons";

type ProjectsListProps = {
  handleProjectDelete: (uuid: string) => void;
};

const updatedFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const isGithubProject = (project: Project) =>
  project.screening_target === ScreeningTarget.GITHUB_REPOSITORY;

// Same names as the project type picker on the "New project" page.
const PROJECT_TYPE_LABEL: Record<ScreeningTarget, string> = {
  [ScreeningTarget.PAPER]: "Literature review",
  [ScreeningTarget.GITHUB_REPOSITORY]: "GitHub repository review",
};

type ProjectFilter = "ALL" | ScreeningTarget;

const FILTERS: Array<{ value: ProjectFilter; label: string; emptyText: string }> = [
  { value: "ALL", label: "All", emptyText: "No projects yet." },
  {
    value: ScreeningTarget.PAPER,
    label: "Literature reviews",
    emptyText: "No literature review projects yet.",
  },
  {
    value: ScreeningTarget.GITHUB_REPOSITORY,
    label: "GitHub repositories",
    emptyText: "No GitHub repository review projects yet.",
  },
];

/** e.g. "Literature review · 3 inclusion / 2 exclusion criteria · Updated 3 Oct 2026" */
const projectSummary = (project: Project) => {
  const { inclusion_criteria, exclusion_criteria } = project.criteria;
  const updated = project.updated_at ?? project.created_at;
  return [
    PROJECT_TYPE_LABEL[project.screening_target],
    `${inclusion_criteria.length} inclusion / ${exclusion_criteria.length} exclusion criteria`,
    updated && `Updated ${updatedFormat.format(updated)}`,
  ]
    .filter(Boolean)
    .join(" · ");
};

const ProjectRow: React.FC<{ project: Project; onDelete: (project: Project) => void }> = ({
  project,
  onDelete,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const closeMenu = () => setMenuAnchor(null);
  return (
    <ListItem
      disablePadding
      data-testid={`project-row-${project.uuid}`}
      secondaryAction={
        <>
          <IconButton
            edge="end"
            aria-label={`More actions for ${project.name}`}
            data-testid={`project-menu-${project.uuid}`}
            onClick={(e) => setMenuAnchor(e.currentTarget)}
          >
            <MoreVertIcon />
          </IconButton>
          <Menu
            anchorEl={menuAnchor}
            open={menuAnchor !== null}
            onClose={closeMenu}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <MenuItem
              sx={{ color: "error.main" }}
              onClick={() => {
                closeMenu();
                onDelete(project);
              }}
            >
              <ListItemIcon sx={{ color: "inherit" }}>
                <DeleteOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Delete</ListItemText>
            </MenuItem>
          </Menu>
        </>
      }
    >
      <ListItemButton component={Link} href={`/project/${project.uuid}`} sx={{ py: 1.5, pr: 8 }}>
        <ListItemAvatar>
          <Avatar
            sx={{ bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1), color: "primary.main" }}
          >
            {isGithubProject(project) ? <GitHubIcon /> : <ArticleOutlinedIcon />}
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={project.name}
          secondary={projectSummary(project)}
          slotProps={{ primary: { sx: { fontWeight: 500 } } }}
        />
      </ListItemButton>
    </ListItem>
  );
};

/** Stands in for the filter chips, sized like "All", "Literature reviews" and "GitHub repositories". */
const LoadingFilters = () => (
  <Box aria-hidden sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
    {[64, 160, 170].map((width) => (
      <Skeleton key={width} variant="rounded" width={width} height={32} sx={{ borderRadius: 4 }} />
    ))}
  </Box>
);

const LoadingRows = () => (
  <List disablePadding aria-hidden>
    {[1, 2, 3].map((i) => (
      <Fragment key={i}>
        {i > 1 && <Divider component="li" />}
        <ListItem sx={{ py: 1.5 }}>
          <ListItemAvatar>
            <Skeleton variant="circular" width={40} height={40} />
          </ListItemAvatar>
          <ListItemText
            primary={<Skeleton width="40%" />}
            secondary={<Skeleton width="60%" />}
          />
        </ListItem>
      </Fragment>
    ))}
  </List>
);

const EmptyState = () => (
  <Card
    sx={{
      ...riseIn(0),
      borderRadius: 2,
      py: 8,
      px: 3,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      gap: 1,
    }}
  >
    <FolderOutlinedIcon sx={{ fontSize: 56, color: "text.disabled" }} />
    <Typography variant="h6">No projects yet</Typography>
    <Typography variant="body2" color="textSecondary" sx={{ maxWidth: 420, mb: 2 }}>
      A project holds your inclusion and exclusion criteria and the papers you want to screen.
    </Typography>
    <Button variant="contained" component={Link} href="/create" startIcon={<AddIcon />}>
      New project
    </Button>
  </Card>
);

export const ProjectsList: React.FC<ProjectsListProps> = ({ handleProjectDelete }) => {
  const loadingProjects = useTypedStoreState((state) => state.loading.projects);
  const projects = useTypedStoreState((state) => state.projects);
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);
  const [filter, setFilter] = useState<ProjectFilter>("ALL");

  // Most recently updated first.
  const sortedProjects = useMemo(
    () =>
      [...projects].sort(
        (a, b) =>
          (b.updated_at?.getTime() ?? 0) - (a.updated_at?.getTime() ?? 0)
      ),
    [projects]
  );
  const visibleProjects =
    filter === "ALL"
      ? sortedProjects
      : sortedProjects.filter((p) => p.screening_target === filter);
  const countFor = (value: ProjectFilter) =>
    value === "ALL" ? projects.length : projects.filter((p) => p.screening_target === value).length;

  // Only the first load shows placeholders: a reload, e.g. after a delete, keeps the list.
  const firstLoad = loadingProjects && projects.length === 0;

  if (!loadingProjects && projects.length === 0) return <EmptyState />;

  if (firstLoad) {
    return (
      <SkeletonGroup>
        <LoadingFilters />
        <Card sx={{ borderRadius: 2 }}>
          <LoadingRows />
        </Card>
      </SkeletonGroup>
    );
  }

  return (
    <FadeIn>
      <Box
        role="group"
        aria-label="Filter by project type"
        sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2, ...riseIn(0) }}
      >
        {FILTERS.map(({ value, label }) => {
          const selected = filter === value;
          return (
            <Chip
              key={value}
              label={`${label} (${countFor(value)})`}
              clickable
              color={selected ? "primary" : "default"}
              variant={selected ? "filled" : "outlined"}
              onClick={() => setFilter(value)}
              aria-pressed={selected}
              data-testid={`project-filter-${value}`}
              sx={selected ? undefined : { bgcolor: "background.paper" }}
            />
          );
        })}
      </Box>
      <Card sx={{ borderRadius: 2, ...riseIn(1) }}>
        {visibleProjects.length === 0 ? (
          <Typography variant="body2" color="textSecondary" sx={{ px: 2, py: 4, textAlign: "center" }}>
            {FILTERS.find((f) => f.value === filter)?.emptyText}
          </Typography>
        ) : (
          // Keyed by the filter, so switching filters fades the new list in.
          <FadeIn key={filter}>
            <List disablePadding>
              {visibleProjects.map((project, i) => (
                <Fragment key={project.uuid}>
                  {i > 0 && <Divider component="li" />}
                  <ProjectRow project={project} onDelete={setPendingDelete} />
                </Fragment>
              ))}
            </List>
          </FadeIn>
        )}
      </Card>
      <ConfirmationModal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) handleProjectDelete(pendingDelete.uuid);
          setPendingDelete(null);
        }}
        title="Delete project?"
        description={`"${pendingDelete?.name ?? ""}" and all of its papers and screening tasks will be deleted. This can't be undone.`}
        confirmButtonLabel="Delete"
        confirmColor="error"
        confirmButtonIcon={<DeleteOutlinedIcon />}
        confirmButtonTestId="confirm-delete-project-button"
      />
    </FadeIn>
  );
};
