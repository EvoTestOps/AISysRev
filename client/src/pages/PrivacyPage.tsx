import { Helmet } from "react-helmet-async";
import { Page } from "../components/Page";
import { H1 } from "../components/Typography";

export const PrivacyPage = () => (
  <Page>
    <Helmet>
      <title>Privacy</title>
    </Helmet>
    <H1>Privacy</H1>
  </Page>
);
