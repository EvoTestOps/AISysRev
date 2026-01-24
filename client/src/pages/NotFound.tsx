import { Helmet } from "react-helmet-async";
import { Layout } from "../components/Layout";
import { AlertMessage } from "../components/AlertMessage";

export const NotFoundPage: React.FC = () => (
  <Layout title="HTTP 404">
    <Helmet>
      <title>Page not found</title>
    </Helmet>
    <AlertMessage message="The page cannot be found. If you believe this is an error, please open a pull request on the AISysRev GitHub repository." />
  </Layout>
);
