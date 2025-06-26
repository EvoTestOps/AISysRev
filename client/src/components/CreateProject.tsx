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
  let projectUuid: string;

  try {
    const res = await create_project(
      props.title,
      props.inclusionCriteria.join(", "),
      props.exclusionCriteria.join(", ")
    );
    
    projectId = res.id;
    projectUuid = res.uuid;
    
    console.log("Project created, res: ", res);

  } catch (error: any) {
    if (error.response?.data?.detail?.errors) {
      throw new Error(JSON.stringify(error.response.data.detail.errors));
    }
    throw error;
  }

  try {
    const uploadedFiles = await fileUploadToBackend(props.files, projectId);
    console.log("Files uploaded successfully:", uploadedFiles);
  } catch (error: any) {
    if (error.response?.data?.detail?.errors) {
      throw new Error(JSON.stringify(error.response.data.detail.errors));
    }
    throw error;
  }

  return projectUuid;
};
