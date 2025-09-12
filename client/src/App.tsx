import { Route, Switch, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { ToastContainer } from "react-toastify";
import Cookies from "js-cookie";
import { NotFoundPage } from "./pages/NotFound";
import { TermsAndConditionsPage } from "./pages/TermsAndConditionsPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { NewProject } from "./pages/NewProjectPage";
import { AboutPage } from "./pages/AboutPage";
import { ProjectPage } from "./pages/ProjectPage";
import { ScreeningPage } from "./pages/ScreeningPage";
import { SettingsPage } from "./pages/SettingPage";
import { ResultPage } from "./pages/ResultPage";
import "react-loading-skeleton/dist/skeleton.css";
import { PapersPage } from "./pages/PapersPage";
import { useTypedStoreActions } from "./state/store";

function App() {
  const [location, navigate] = useLocation();
  const [checkedTerms, setCheckedTerms] = useState(false);

  const fetchProjects = useTypedStoreActions(
    (actions) => actions.fetchProjects
  );

  useEffect(() => {
    const hasReadTerms = Cookies.get("disclaimer_read");
    if (!hasReadTerms && location !== "/terms-and-conditions") {
      navigate("/terms-and-conditions");
    }
    setCheckedTerms(true);
  }, [location, navigate]);

  // Initialization hook
  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!checkedTerms) return null;

  return (
    <div className="flex flex-col bg-gray-200">
      <ToastContainer autoClose={4000} />
      <Switch>
        <Route path="/" component={ProjectsPage} />
        <Route path="/projects" component={ProjectsPage} />
        <Route path="/create" component={NewProject} />
        <Route path="/project/:uuid" component={ProjectPage} />
        <Route path="/project/:uuid/papers" component={PapersPage} />
        <Route path="/project/:uuid/evaluate" component={ProjectPage} />
        <Route path="/about" component={AboutPage} />
        <Route
          path="/terms-and-conditions"
          component={TermsAndConditionsPage}
        />
        <Route path="/screening" component={ScreeningPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/result/:uuid" component={ResultPage} />
        <Route path="*" component={NotFoundPage} />
      </Switch>
    </div>
  );
}

export default App;
