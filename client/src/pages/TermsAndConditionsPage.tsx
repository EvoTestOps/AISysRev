import { Helmet } from "react-helmet-async";
import { Page } from "../components/Page";
import { H1 } from "../components/Typography";

export const TermsAndConditionsPage = () => (
  <Page>
    <Helmet>
      <title>Terms and conditions</title>
    </Helmet>
    <H1>Terms and conditions</H1>
  </Page>
);
