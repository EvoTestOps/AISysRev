import AddIcon from "@mui/icons-material/Add";
import Button from "@mui/material/Button";
import { Link } from "wouter";
import { useCallback } from "react";
import { toast } from "react-toastify";
import { Layout } from "../components/Layout";
import { delete_project } from "../services/projectService";
import { ProjectsList } from "../components/ProjectsList";
import { useTypedStoreActions } from "../state/store";

export const ProjectsPage = () => {
  const fetchProjects = useTypedStoreActions(
    (actions) => actions.fetchProjects
  );
  const handleProjectDelete = useCallback(
    async (uuid: string) => {
      try {
        await delete_project(uuid);
        fetchProjects();
        toast.success("Project deleted successfully", { autoClose: 1500 });
      } catch (error) {
        console.error("Error deleting project:", error);
      }
    },
    [fetchProjects]
  );

  return (
    <Layout
      title="Projects"
      headerActions={
        <Button
          variant="contained"
          component={Link}
          href="/create"
          startIcon={<AddIcon />}
          data-testid="new-project-button"
        >
          New project
        </Button>
      }
    >
      <ProjectsList handleProjectDelete={handleProjectDelete} />
    </Layout>
  );
};
