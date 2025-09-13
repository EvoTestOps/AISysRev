import { Helmet } from "react-helmet-async";
import { H1 } from "../components/Typography";
import { Layout } from "lucide-react";

export const NotFoundPage: React.FC = () => (
  <Layout>
    <Helmet>
      <title>Page not found</title>
    </Helmet>
    <H1>Not found</H1>
  </Layout>
);
