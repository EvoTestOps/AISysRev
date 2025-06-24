import { ScreeningPage } from "./pages/ScreeningPage";

import { Route, Switch } from "wouter";
import { NotFoundPage } from "./pages/404";
import { TermsAndConditionsPage } from "./pages/TermsAndConditionsPage";
import { Projects } from "./pages/ProjectsPage";
import { NewProject } from "./pages/NewProjectPage";
import { AboutPage } from "./pages/AboutPage";

function App() {
  return (
    <div className="flex flex-col">
      <Switch>
        <Route path="/" component={Projects} />
        <Route path="/projects" component={Projects} />
        <Route path="/create" component={NewProject} />

        <Route path="/about" component={AboutPage} />
        <Route path="/screen" component={ScreeningPage} />
        <Route
          path="/terms-and-conditions"
          component={TermsAndConditionsPage}
        />
        <Route path="*" component={NotFoundPage} />
      </Switch>
    </div>
  );
}

export default App;
