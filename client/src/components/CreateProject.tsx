import { create_project } from "../services/projectService";
import { Criteria } from "../state/types";

type CreateProjectProps = {
  title: string;
  inclusionCriteria: string[];
  exclusionCriteria: string[];
};

export const CreateProject = async (props: CreateProjectProps): Promise<{
  id: string
  uuid:string
}> => {

  const criteria: Criteria = {
    inclusion_criteria: props.inclusionCriteria,
    exclusion_criteria: props.exclusionCriteria
  };

  try {
    const res = await create_project(
      props.title,
      criteria
    );
    console.log("Project created, res: ", res);
    return {"id": res.id, "uuid": res.uuid};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (error.response?.data?.detail?.errors) {
      throw new Error(JSON.stringify(error.response.data.detail.errors));
    }
    throw error;
  }
};
