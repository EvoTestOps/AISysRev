import { create_project } from "../services/projectService";
import { fileUploadToBackend } from "../services/fileUploadService";

type CreateProjectProps = {
  title: string;
  files: File[];
  inclusionCriteria: string[];
  exclusionCriteria: string[];
};

export const CreateProject = async (props: CreateProjectProps) => {
  let projectId: string;
  try {
    projectId = await create_project(props.title, props.inclusionCriteria.join(", "), props.exclusionCriteria.join(", "));
    console.log("Project created, id: ", projectId);
  } catch (error) {
    console.error("Error creating project:", error);
    throw error;
  }

  try {
    const uploadedFiles = await fileUploadToBackend(props.files, projectId);
    console.log("Files uploaded successfully:", uploadedFiles);
  } catch (error) {
    console.error("Error uploading files:", error);
    throw error;
  }
};
