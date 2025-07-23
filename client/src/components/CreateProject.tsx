import { create_project } from "../services/projectService";

type CreateProjectProps = {
  title: string;
  inclusionCriteria: string[];
  exclusionCriteria: string[];
};

export const CreateProject = async (props: CreateProjectProps): Promise<{
  id: string
  uuid:string
}> => {

  try {
    const res = await create_project(
      props.title,
      props.inclusionCriteria.join(";"),
      props.exclusionCriteria.join(";")
    );
    return {"id": res.id, "uuid": res.uuid};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (error.response?.data?.detail?.errors) {
      throw new Error(JSON.stringify(error.response.data.detail.errors));
    }
    throw error;
  }
};
