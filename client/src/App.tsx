import { Route, Switch } from "wouter";
import { Navigation } from "./components/Navigation";
// import FrontPage from "./pages/FrontPage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/404";
import { ScreeningPage } from "./pages/ScreeningPage";
import { AboutPage } from "./pages/AboutPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { TermsAndConditionsPage } from "./pages/TermsAndConditionsPage";

function App() {
  return (
    <div className="flex flex-col">
      <Navigation />
      <Switch>
        <Route path="/" component={ScreeningPage} />
        {/*<Route path="/" component={FrontPage} />*/}
        <Route path="/about" component={AboutPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/screen" component={ScreeningPage} />
        <Route
          path="/terms-and-conditions"
          component={TermsAndConditionsPage}
        />
        <Route path="/privacy" component={PrivacyPage} />
        <Route path="*" component={NotFoundPage} />
      </Switch>
    </div>
  );
}

export default App;
