import { Helmet } from "react-helmet-async";
import { Page } from "../components/Page";


export const Projects = () => {
  return (
    <div className="flex flex-col bg-stone-300 items-center justify-center h-screen">
      <Page>
        <Helmet>
          <title>Projects</title>
        </Helmet>
        
      </Page>
    </div>
  );
};