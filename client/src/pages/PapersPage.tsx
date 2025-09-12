import { useParams } from "wouter";
import { Layout } from "../components/Layout";
import { useTypedStoreState } from "../state/store";
import { TabButton } from "../components/TabButton";
import { NotFoundPage } from "./NotFound";

export const PapersPage = () => {
  const params = useParams<{ uuid: string }>();
  const uuid = params.uuid;
  const loadingProjects = useTypedStoreState((state) => state.loading.projects);
  const getProjectByUuid = useTypedStoreState(
    (state) => state.getProjectByUuid
  );
  const project = getProjectByUuid(uuid);
  if (loadingProjects) {
    return null;
  }
  if (project === undefined) {
    return <NotFoundPage />;
  }

  return (
    <Layout title={project.name}>
      <div className="flex flex-row mb-4">
        <TabButton href={`/project/${params.uuid}`}>Tasks</TabButton>
        <TabButton href={`/project/${params.uuid}/papers`} active>
          List of papers
        </TabButton>
      </div>
    </Layout>
  );
};
