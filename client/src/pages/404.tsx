import { Helmet } from "react-helmet-async";
import { Page } from "../components/Page";
import { H1 } from "../components/Typography";

export const NotFoundPage = () => (
  <Page>
    <Helmet>
      <title>Page not found</title>
    </Helmet>
    <H1>Not found</H1>
  </Page>
);
