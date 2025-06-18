// import FrontPage from "./pages/FrontPage";
import { LoginPage } from "./pages/LoginPage";
import { ScreeningPage } from "./pages/ScreeningPage";
import { PrivacyPage } from "./pages/PrivacyPage";

import { Route, Switch } from "wouter";
import { NotFoundPage } from "./pages/404";
import { TermsAndConditionsPage } from "./pages/TermsAndConditionsPage";
import { NavigationBar } from "./components/NavigationBar";
import { Projects } from "./pages/ProjectsPage";
import { NewProject } from "./pages/NewProjectPage";
import { AboutPage } from "./pages/AboutPage";

function App() {
  return (
    <div className="flex flex-col">
      <NavigationBar name="Projects"/>
      <Switch>
        <Route path="/" component={ScreeningPage} />
        <Route path="/projects" component={Projects} />
        <Route path="/create" component={NewProject} />

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
