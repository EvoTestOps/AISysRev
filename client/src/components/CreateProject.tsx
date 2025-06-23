import { create_project } from "../services/projectService";
import { fileUploadToBackend } from "../services/fileUploadService";

type CreateProjectProps = {
  title: string;
  files: File[];
  inclusionCriteria: string[];
  exclusionCriteria: string[];
};

export const CreateProject = async (props: CreateProjectProps) => {
  const { title, files, inclusionCriteria, exclusionCriteria } = props;
  let projectId: string;
  try {
    projectId = await create_project(title, inclusionCriteria.join(", "), exclusionCriteria.join(", "));
    console.log("Project created, id: ", projectId);
  } catch (error) {
    console.error("Error creating project:", error);
    throw error;
  }

  try {
    const uploadedFiles = await fileUploadToBackend(files, projectId);
    console.log("Files uploaded successfully:", uploadedFiles);
  } catch (error) {
    console.error("Error uploading files:", error);
    throw error;
  }
};
