import { Helmet } from "react-helmet-async";
import { Page } from "../components/Page";
import { H1 } from "../components/Typography";

export const AboutPage = () => (
  <Page>
    <Helmet>
      <title>About</title>
    </Helmet>
    <H1>About</H1>
  </Page>
);
